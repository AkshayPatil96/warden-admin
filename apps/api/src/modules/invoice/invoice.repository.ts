import { Prisma } from '../../generated/prisma/client.js'
import type { InvoiceStatus, PrismaClient } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ListInvoicesParams {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  status?: InvoiceStatus
  customerId?: string
  subscriptionId?: string
}

export type InvoiceEntity = Prisma.InvoiceGetPayload<object>

// Whitelist sortable columns — never pass a user-supplied string straight into orderBy.
const SORTABLE_FIELDS = new Set<keyof Prisma.InvoiceOrderByWithRelationInput>([
  'number',
  'status',
  'amountCents',
  'dueDate',
  'createdAt',
])

function buildWhere(params: ListInvoicesParams): Prisma.InvoiceWhereInput {
  const where: Prisma.InvoiceWhereInput = {}
  if (params.status) {
    where.status = params.status
  }
  if (params.customerId) {
    where.customerId = params.customerId
  }
  if (params.subscriptionId) {
    where.subscriptionId = params.subscriptionId
  }
  return where
}

export async function listInvoices(
  params: ListInvoicesParams
): Promise<{ data: InvoiceEntity[]; total: number }> {
  const where = buildWhere(params)
  const sortField =
    params.sort && SORTABLE_FIELDS.has(params.sort as keyof Prisma.InvoiceOrderByWithRelationInput)
      ? params.sort
      : 'createdAt'

  const [data, total] = await prisma.$transaction([
    prisma.invoice.findMany({
      where,
      orderBy: { [sortField]: params.order },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.invoice.count({ where }),
  ])

  return { data, total }
}

export async function findInvoiceById(id: string, client: DbClient = prisma): Promise<InvoiceEntity | null> {
  return client.invoice.findUnique({ where: { id } })
}

export async function createInvoice(
  data: Prisma.InvoiceUncheckedCreateInput,
  client: DbClient = prisma
): Promise<InvoiceEntity> {
  return client.invoice.create({ data })
}

export async function updateInvoice(
  id: string,
  data: Prisma.InvoiceUncheckedUpdateInput,
  client: DbClient = prisma
): Promise<InvoiceEntity> {
  return client.invoice.update({ where: { id }, data })
}

export async function deleteInvoice(id: string, client: DbClient = prisma): Promise<void> {
  await client.invoice.delete({ where: { id } })
}
