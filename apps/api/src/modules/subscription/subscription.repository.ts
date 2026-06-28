import { Prisma } from '../../generated/prisma/client.js'
import type { PrismaClient, SubscriptionPlan, SubscriptionStatus } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ListSubscriptionsParams {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  status?: SubscriptionStatus
  plan?: SubscriptionPlan
  customerId?: string
}

export type SubscriptionEntity = Prisma.SubscriptionGetPayload<object>

// Whitelist sortable columns — never pass a user-supplied string straight into orderBy.
const SORTABLE_FIELDS = new Set<keyof Prisma.SubscriptionOrderByWithRelationInput>([
  'plan',
  'status',
  'priceCents',
  'currentPeriodEnd',
  'createdAt',
])

function buildWhere(params: ListSubscriptionsParams): Prisma.SubscriptionWhereInput {
  const where: Prisma.SubscriptionWhereInput = {}
  if (params.status) {
    where.status = params.status
  }
  if (params.plan) {
    where.plan = params.plan
  }
  if (params.customerId) {
    where.customerId = params.customerId
  }
  return where
}

export async function listSubscriptions(
  params: ListSubscriptionsParams
): Promise<{ data: SubscriptionEntity[]; total: number }> {
  const where = buildWhere(params)
  const sortField =
    params.sort &&
    SORTABLE_FIELDS.has(params.sort as keyof Prisma.SubscriptionOrderByWithRelationInput)
      ? params.sort
      : 'createdAt'

  const [data, total] = await prisma.$transaction([
    prisma.subscription.findMany({
      where,
      orderBy: { [sortField]: params.order },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.subscription.count({ where }),
  ])

  return { data, total }
}

export async function findSubscriptionById(
  id: string,
  client: DbClient = prisma
): Promise<SubscriptionEntity | null> {
  return client.subscription.findUnique({ where: { id } })
}

export async function createSubscription(
  data: Prisma.SubscriptionUncheckedCreateInput,
  client: DbClient = prisma
): Promise<SubscriptionEntity> {
  return client.subscription.create({ data })
}

export async function updateSubscription(
  id: string,
  data: Prisma.SubscriptionUpdateInput,
  client: DbClient = prisma
): Promise<SubscriptionEntity> {
  return client.subscription.update({ where: { id }, data })
}

export async function deleteSubscription(id: string, client: DbClient = prisma): Promise<void> {
  await client.subscription.delete({ where: { id } })
}
