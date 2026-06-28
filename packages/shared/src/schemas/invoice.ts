import { z } from 'zod'
import { paginationQuerySchema } from './common.js'

export const invoiceStatusSchema = z.enum(['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE'])
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>

// Money as integer cents; timestamps are ISO 8601 UTC strings over the wire.
export const invoiceSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  subscriptionId: z.string().uuid().nullable(),
  number: z.string(),
  status: invoiceStatusSchema,
  amountCents: z.number().int(),
  currency: z.string(),
  dueDate: z.string(),
  paidAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Invoice = z.infer<typeof invoiceSchema>

export const createInvoiceSchema = z.object({
  customerId: z.string().uuid('A valid customer id is required.'),
  subscriptionId: z.string().uuid().optional(),
  number: z.string().trim().min(1, 'Invoice number is required.'),
  status: invoiceStatusSchema.default('DRAFT'),
  amountCents: z.number().int().min(0),
  currency: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{3}$/, 'Currency must be a 3-letter ISO code.')
    .default('usd'),
  dueDate: z.coerce.date(),
})
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>

// customerId and number are immutable once issued — omit them from updates.
export const updateInvoiceSchema = createInvoiceSchema.partial().omit({ customerId: true, number: true })
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>

export const listInvoicesQuerySchema = paginationQuerySchema.extend({
  status: invoiceStatusSchema.optional(),
  customerId: z.string().uuid().optional(),
  subscriptionId: z.string().uuid().optional(),
})
export type ListInvoicesQuery = z.infer<typeof listInvoicesQuerySchema>

export interface InvoiceListResult {
  data: Invoice[]
  total: number
  page: number
  pageSize: number
}
