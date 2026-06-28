import { Prisma } from '../../generated/prisma/client.js'
import { ConflictAppError, NotFoundAppError, ValidationAppError } from '../../core/errors/app-error.js'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import type {
  CreateInvoiceInput,
  Invoice,
  InvoiceListResult,
  ListInvoicesQuery,
  UpdateInvoiceInput,
} from '@admin/shared'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import { findCustomerById } from '../customer/customer.repository.js'
import { findSubscriptionById } from '../subscription/subscription.repository.js'
import {
  createInvoice as createInvoiceRow,
  deleteInvoice as deleteInvoiceRow,
  findInvoiceById,
  listInvoices as listInvoiceRows,
  updateInvoice as updateInvoiceRow,
  type InvoiceEntity,
} from './invoice.repository.js'

// One mapper for both HTTP responses and audit snapshots — keeps dates JSON-safe and in sync.
function toInvoice(entity: InvoiceEntity): Invoice {
  return {
    id: entity.id,
    customerId: entity.customerId,
    subscriptionId: entity.subscriptionId,
    number: entity.number,
    status: entity.status,
    amountCents: entity.amountCents,
    currency: entity.currency,
    dueDate: entity.dueDate.toISOString(),
    paidAt: entity.paidAt ? entity.paidAt.toISOString() : null,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
}

// A linked subscription must exist and belong to the same customer as the invoice.
async function assertSubscriptionForCustomer(
  subscriptionId: string,
  customerId: string,
  client: Prisma.TransactionClient
): Promise<void> {
  const subscription = await findSubscriptionById(subscriptionId, client)
  if (!subscription) {
    throw new NotFoundAppError('Subscription not found.')
  }
  if (subscription.customerId !== customerId) {
    throw new ValidationAppError('Subscription does not belong to this customer.')
  }
}

export async function listInvoices(query: ListInvoicesQuery): Promise<InvoiceListResult> {
  const { data, total } = await listInvoiceRows({
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    order: query.order,
    status: query.status,
    customerId: query.customerId,
    subscriptionId: query.subscriptionId,
  })

  return {
    data: data.map(toInvoice),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getInvoice(id: string): Promise<Invoice> {
  const entity = await findInvoiceById(id)
  if (!entity) {
    throw new NotFoundAppError('Invoice not found.')
  }
  return toInvoice(entity)
}

export async function createInvoice(input: CreateInvoiceInput, actor: AuthenticatedUser): Promise<Invoice> {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const customer = await findCustomerById(input.customerId, client)
    if (!customer) {
      throw new NotFoundAppError('Customer not found.')
    }
    if (input.subscriptionId) {
      await assertSubscriptionForCustomer(input.subscriptionId, input.customerId, client)
    }

    let created: InvoiceEntity
    try {
      created = await createInvoiceRow(
        {
          customerId: input.customerId,
          subscriptionId: input.subscriptionId ?? null,
          number: input.number,
          status: input.status,
          amountCents: input.amountCents,
          currency: input.currency,
          dueDate: input.dueDate,
          paidAt: input.status === 'PAID' ? new Date() : null,
        },
        client
      )
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConflictAppError('An invoice with this number already exists.')
      }
      throw error
    }

    const invoice = toInvoice(created)
    await writeAudit(
      {
        actorId: actor.id,
        action: 'invoice.create',
        entity: 'invoice',
        entityId: invoice.id,
        after: invoice,
      },
      client
    )

    return invoice
  })
}

export async function updateInvoice(
  id: string,
  input: UpdateInvoiceInput,
  actor: AuthenticatedUser
): Promise<Invoice> {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await findInvoiceById(id, client)
    if (!existing) {
      throw new NotFoundAppError('Invoice not found.')
    }
    if (input.subscriptionId) {
      await assertSubscriptionForCustomer(input.subscriptionId, existing.customerId, client)
    }

    const data: Prisma.InvoiceUncheckedUpdateInput = {
      subscriptionId: input.subscriptionId,
      amountCents: input.amountCents,
      currency: input.currency,
      dueDate: input.dueDate,
    }

    // Keep paidAt consistent with status: stamp it when paid, clear it otherwise.
    if (input.status !== undefined) {
      data.status = input.status
      if (input.status === 'PAID') {
        data.paidAt = existing.paidAt ?? new Date()
      } else {
        data.paidAt = null
      }
    }

    const updated = await updateInvoiceRow(id, data, client)
    const before = toInvoice(existing)
    const after = toInvoice(updated)

    await writeAudit(
      {
        actorId: actor.id,
        action: 'invoice.update',
        entity: 'invoice',
        entityId: id,
        before,
        after,
      },
      client
    )

    return after
  })
}

export async function deleteInvoice(id: string, actor: AuthenticatedUser): Promise<void> {
  await prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await findInvoiceById(id, client)
    if (!existing) {
      throw new NotFoundAppError('Invoice not found.')
    }

    await deleteInvoiceRow(id, client)

    await writeAudit(
      {
        actorId: actor.id,
        action: 'invoice.delete',
        entity: 'invoice',
        entityId: id,
        before: toInvoice(existing),
      },
      client
    )
  })
}
