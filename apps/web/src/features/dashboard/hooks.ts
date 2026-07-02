'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'

// The list endpoints return { data, total, page, pageSize }. We only need the
// total, so ask for the smallest page. This is real aggregated data, not mocked.
interface ListResult {
  total: number
}

async function totalOf(resource: string): Promise<number> {
  const res = await apiClient<ListResult>(`/api/v1/${resource}?page=1&pageSize=1`)
  return res.total
}

export interface BillingTotals {
  customers: number
  subscriptions: number
  invoices: number
}

export function useBillingTotals() {
  return useQuery<BillingTotals>({
    queryKey: ['dashboard', 'totals'],
    queryFn: async () => {
      const [customers, subscriptions, invoices] = await Promise.all([
        totalOf('customers'),
        totalOf('subscriptions'),
        totalOf('invoices'),
      ])
      return { customers, subscriptions, invoices }
    },
    staleTime: 60_000,
  })
}
