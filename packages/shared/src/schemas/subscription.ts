import { z } from 'zod'
import { paginationQuerySchema } from './common.js'

export const subscriptionPlanSchema = z.enum(['STARTER', 'PRO', 'ENTERPRISE'])
export type SubscriptionPlan = z.infer<typeof subscriptionPlanSchema>

export const subscriptionStatusSchema = z.enum(['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED'])
export type SubscriptionStatus = z.infer<typeof subscriptionStatusSchema>

export const billingIntervalSchema = z.enum(['MONTHLY', 'YEARLY'])
export type BillingInterval = z.infer<typeof billingIntervalSchema>

// Money as integer cents; all timestamps are ISO 8601 UTC strings over the wire.
export const subscriptionSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  plan: subscriptionPlanSchema,
  status: subscriptionStatusSchema,
  interval: billingIntervalSchema,
  priceCents: z.number().int(),
  currentPeriodEnd: z.string(),
  canceledAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Subscription = z.infer<typeof subscriptionSchema>

export const createSubscriptionSchema = z.object({
  customerId: z.string().uuid('A valid customer id is required.'),
  plan: subscriptionPlanSchema,
  status: subscriptionStatusSchema.default('TRIALING'),
  interval: billingIntervalSchema.default('MONTHLY'),
  priceCents: z.number().int().min(0),
  currentPeriodEnd: z.coerce.date(),
})
export type CreateSubscriptionInput = z.infer<typeof createSubscriptionSchema>

// A subscription can't be moved to a different customer — omit customerId from updates.
export const updateSubscriptionSchema = createSubscriptionSchema.partial().omit({ customerId: true })
export type UpdateSubscriptionInput = z.infer<typeof updateSubscriptionSchema>

export const listSubscriptionsQuerySchema = paginationQuerySchema.extend({
  status: subscriptionStatusSchema.optional(),
  plan: subscriptionPlanSchema.optional(),
  customerId: z.string().uuid().optional(),
})
export type ListSubscriptionsQuery = z.infer<typeof listSubscriptionsQuerySchema>

export interface SubscriptionListResult {
  data: Subscription[]
  total: number
  page: number
  pageSize: number
}
