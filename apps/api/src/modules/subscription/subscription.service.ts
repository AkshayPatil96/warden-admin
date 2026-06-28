import type { Prisma } from '../../generated/prisma/client.js'
import { NotFoundAppError } from '../../core/errors/app-error.js'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import type {
  CreateSubscriptionInput,
  ListSubscriptionsQuery,
  Subscription,
  SubscriptionListResult,
  UpdateSubscriptionInput,
} from '@admin/shared'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { findCustomerById } from '../customer/customer.repository.js'
import {
  createSubscription as createSubscriptionRow,
  deleteSubscription as deleteSubscriptionRow,
  findSubscriptionById,
  listSubscriptions as listSubscriptionRows,
  updateSubscription as updateSubscriptionRow,
  type SubscriptionEntity,
} from './subscription.repository.js'

// One mapper for both HTTP responses and audit snapshots — keeps dates JSON-safe and in sync.
function toSubscription(entity: SubscriptionEntity): Subscription {
  return {
    id: entity.id,
    customerId: entity.customerId,
    plan: entity.plan,
    status: entity.status,
    interval: entity.interval,
    priceCents: entity.priceCents,
    currentPeriodEnd: entity.currentPeriodEnd.toISOString(),
    canceledAt: entity.canceledAt ? entity.canceledAt.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}

export async function listSubscriptions(query: ListSubscriptionsQuery): Promise<SubscriptionListResult> {
  const { data, total } = await listSubscriptionRows({
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    order: query.order,
    status: query.status,
    plan: query.plan,
    customerId: query.customerId,
  })

  return {
    data: data.map(toSubscription),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getSubscription(id: string): Promise<Subscription> {
  const entity = await findSubscriptionById(id)
  if (!entity) {
    throw new NotFoundAppError('Subscription not found.')
  }
  return toSubscription(entity)
}

export async function createSubscription(
  input: CreateSubscriptionInput,
  actor: AuthenticatedUser
): Promise<Subscription> {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    // App-level FK check so a bad customerId is a clean 404, not a raw Prisma error.
    const customer = await findCustomerById(input.customerId, client)
    if (!customer) {
      throw new NotFoundAppError('Customer not found.')
    }

    const created = await createSubscriptionRow(
      {
        customerId: input.customerId,
        plan: input.plan,
        status: input.status,
        interval: input.interval,
        priceCents: input.priceCents,
        currentPeriodEnd: input.currentPeriodEnd,
        canceledAt: input.status === 'CANCELED' ? new Date() : null,
      },
      client
    )
    const subscription = toSubscription(created)

    await writeAudit(
      {
        actorId: actor.id,
        action: 'subscription.create',
        entity: 'subscription',
        entityId: subscription.id,
        after: subscription,
      },
      client
    )

    return subscription
  })
}

export async function updateSubscription(
  id: string,
  input: UpdateSubscriptionInput,
  actor: AuthenticatedUser
): Promise<Subscription> {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await findSubscriptionById(id, client)
    if (!existing) {
      throw new NotFoundAppError('Subscription not found.')
    }

    const data: Prisma.SubscriptionUpdateInput = {
      plan: input.plan,
      interval: input.interval,
      priceCents: input.priceCents,
      currentPeriodEnd: input.currentPeriodEnd,
    }

    // Keep canceledAt consistent with status: stamp it when cancelling, clear it when reactivating.
    if (input.status !== undefined) {
      data.status = input.status
      if (input.status === 'CANCELED') {
        data.canceledAt = existing.canceledAt ?? new Date()
      } else {
        data.canceledAt = null
      }
    }

    const updated = await updateSubscriptionRow(id, data, client)
    const before = toSubscription(existing)
    const after = toSubscription(updated)

    await writeAudit(
      {
        actorId: actor.id,
        action: 'subscription.update',
        entity: 'subscription',
        entityId: id,
        before,
        after,
      },
      client
    )

    return after
  })
}

export async function deleteSubscription(id: string, actor: AuthenticatedUser): Promise<void> {
  await prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await findSubscriptionById(id, client)
    if (!existing) {
      throw new NotFoundAppError('Subscription not found.')
    }

    await deleteSubscriptionRow(id, client)

    await writeAudit(
      {
        actorId: actor.id,
        action: 'subscription.delete',
        entity: 'subscription',
        entityId: id,
        before: toSubscription(existing),
      },
      client
    )
  })
}
