import type { DashboardSummary } from '@admin/shared'
import {
  fetchCustomersByStatus,
  fetchInvoicesByStatus,
  fetchKpis,
  fetchRevenueTrend,
  fetchSubscriptionsByPlan,
} from './analytics.repository.js'

// Analytics queries scan whole tables — don't run them on every page load. A short
// in-memory TTL is enough at single-instance scale.
// ponytail: process-local cache; swap for Redis if the API runs multiple instances.
const TTL_MS = 60_000
let cache: { at: number; data: DashboardSummary } | null = null

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.data
  }

  const [kpis, customersByStatus, subscriptionsByPlan, invoicesByStatus, revenueTrend] = await Promise.all([
    fetchKpis(),
    fetchCustomersByStatus(),
    fetchSubscriptionsByPlan(),
    fetchInvoicesByStatus(),
    fetchRevenueTrend(),
  ])

  const data: DashboardSummary = {
    kpis,
    customersByStatus,
    subscriptionsByPlan,
    invoicesByStatus,
    revenueTrend,
  }
  cache = { at: Date.now(), data }
  return data
}
