import { z } from 'zod'
import { paginationQuerySchema } from './common.js'

export const customerStatusSchema = z.enum(['ACTIVE', 'PAST_DUE', 'CANCELED'])
export type CustomerStatus = z.infer<typeof customerStatusSchema>

// Money is stored as integer cents — never floats — to avoid rounding drift.
export const customerSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  company: z.string().nullable(),
  status: customerStatusSchema,
  mrrCents: z.number().int(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Customer = z.infer<typeof customerSchema>

export const createCustomerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required.'),
  email: z.string().trim().email('A valid email is required.').toLowerCase(),
  company: z.string().trim().min(1).optional(),
  status: customerStatusSchema.default('ACTIVE'),
  mrrCents: z.number().int().min(0).default(0),
})
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>

export const updateCustomerSchema = createCustomerSchema.partial()
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>

export const listCustomersQuerySchema = paginationQuerySchema.extend({
  status: customerStatusSchema.optional(),
})
export type ListCustomersQuery = z.infer<typeof listCustomersQuerySchema>

export interface CustomerListResult {
  data: Customer[]
  total: number
  page: number
  pageSize: number
}
