import { Prisma } from '../../generated/prisma/client.js'
import type { CustomerStatus, PrismaClient } from '../../generated/prisma/client.js'
import { prisma } from '../../lib/prisma.js'

type DbClient = PrismaClient | Prisma.TransactionClient

export interface ListCustomersParams {
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  search?: string
  status?: CustomerStatus
}

export type CustomerEntity = Prisma.CustomerGetPayload<object>

// Whitelist sortable columns — never pass a user-supplied string straight into orderBy.
const SORTABLE_FIELDS = new Set<keyof Prisma.CustomerOrderByWithRelationInput>([
  'name',
  'email',
  'status',
  'mrrCents',
  'createdAt',
])

function buildWhere(params: ListCustomersParams): Prisma.CustomerWhereInput {
  const where: Prisma.CustomerWhereInput = {}
  if (params.status) {
    where.status = params.status
  }
  if (params.search) {
    where.OR = [
      { name: { contains: params.search, mode: 'insensitive' } },
      { email: { contains: params.search, mode: 'insensitive' } },
      { company: { contains: params.search, mode: 'insensitive' } },
    ]
  }
  return where
}

export async function listCustomers(
  params: ListCustomersParams
): Promise<{ data: CustomerEntity[]; total: number }> {
  const where = buildWhere(params)
  const sortField =
    params.sort && SORTABLE_FIELDS.has(params.sort as keyof Prisma.CustomerOrderByWithRelationInput)
      ? params.sort
      : 'createdAt'

  const [data, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      orderBy: { [sortField]: params.order },
      skip: (params.page - 1) * params.pageSize,
      take: params.pageSize,
    }),
    prisma.customer.count({ where }),
  ])

  return { data, total }
}

export async function findCustomerById(id: string, client: DbClient = prisma): Promise<CustomerEntity | null> {
  return client.customer.findUnique({ where: { id } })
}

export async function createCustomer(
  data: Prisma.CustomerCreateInput,
  client: DbClient = prisma
): Promise<CustomerEntity> {
  return client.customer.create({ data })
}

export async function updateCustomer(
  id: string,
  data: Prisma.CustomerUpdateInput,
  client: DbClient = prisma
): Promise<CustomerEntity> {
  return client.customer.update({ where: { id }, data })
}

export async function deleteCustomer(id: string, client: DbClient = prisma): Promise<void> {
  await client.customer.delete({ where: { id } })
}
