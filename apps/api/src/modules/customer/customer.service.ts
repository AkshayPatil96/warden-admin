import type { Prisma } from '../../generated/prisma/client.js'
import { NotFoundAppError } from '../../core/errors/app-error.js'
import { prisma } from '../../lib/prisma.js'
import { writeAudit } from '../../lib/audit.js'
import type {
  Customer,
  CustomerListResult,
  CreateCustomerInput,
  ListCustomersQuery,
  UpdateCustomerInput,
} from '@admin/shared'
import type { AuthenticatedUser } from '../auth/auth.types.js'
import {
  createCustomer as createCustomerRow,
  deleteCustomer as deleteCustomerRow,
  findCustomerById,
  listCustomers as listCustomerRows,
  updateCustomer as updateCustomerRow,
  type CustomerEntity,
} from './customer.repository.js'

// Single mapper used for HTTP responses AND audit snapshots, so dates are always JSON-safe
// (Instant -> ISO string) and the two never drift.
function toCustomer(entity: CustomerEntity): Customer {
  return {
    id: entity.id,
    name: entity.name,
    email: entity.email,
    company: entity.company,
    status: entity.status,
    mrrCents: entity.mrrCents,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  }
}

export async function listCustomers(query: ListCustomersQuery): Promise<CustomerListResult> {
  const { data, total } = await listCustomerRows({
    page: query.page,
    pageSize: query.pageSize,
    sort: query.sort,
    order: query.order,
    search: query.search,
    status: query.status,
  })

  return {
    data: data.map(toCustomer),
    total,
    page: query.page,
    pageSize: query.pageSize,
  }
}

export async function getCustomer(id: string): Promise<Customer> {
  const entity = await findCustomerById(id)
  if (!entity) {
    throw new NotFoundAppError('Customer not found.')
  }
  return toCustomer(entity)
}

export async function createCustomer(input: CreateCustomerInput, actor: AuthenticatedUser): Promise<Customer> {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const created = await createCustomerRow(
      {
        name: input.name,
        email: input.email,
        company: input.company,
        status: input.status,
        mrrCents: input.mrrCents,
      },
      client
    )
    const customer = toCustomer(created)

    await writeAudit(
      {
        actorId: actor.id,
        action: 'customer.create',
        entity: 'customer',
        entityId: customer.id,
        after: customer,
      },
      client
    )

    return customer
  })
}

export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput,
  actor: AuthenticatedUser
): Promise<Customer> {
  return prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await findCustomerById(id, client)
    if (!existing) {
      throw new NotFoundAppError('Customer not found.')
    }

    const updated = await updateCustomerRow(id, input, client)
    const before = toCustomer(existing)
    const after = toCustomer(updated)

    await writeAudit(
      {
        actorId: actor.id,
        action: 'customer.update',
        entity: 'customer',
        entityId: id,
        before,
        after,
      },
      client
    )

    return after
  })
}

export async function deleteCustomer(id: string, actor: AuthenticatedUser): Promise<void> {
  await prisma.$transaction(async (client: Prisma.TransactionClient) => {
    const existing = await findCustomerById(id, client)
    if (!existing) {
      throw new NotFoundAppError('Customer not found.')
    }

    await deleteCustomerRow(id, client)

    await writeAudit(
      {
        actorId: actor.id,
        action: 'customer.delete',
        entity: 'customer',
        entityId: id,
        before: toCustomer(existing),
      },
      client
    )
  })
}
