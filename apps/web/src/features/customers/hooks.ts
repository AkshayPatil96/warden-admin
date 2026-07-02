'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { customersApi } from './api'
import type { CreateCustomerInput, ListCustomersQuery, UpdateCustomerInput } from './types'

export function useCustomers(query: ListCustomersQuery) {
  return useQuery({
    queryKey: ['customers', query],
    queryFn: () => customersApi.list(query),
    placeholderData: keepPreviousData,
  })
}

// Lightweight option source for the customer picker on subscriptions/invoices.
// One large page is plenty at this scale; upgrade to a typeahead if it grows.
export function useCustomerOptions() {
  return useQuery({
    queryKey: ['customers', 'options'],
    queryFn: () => customersApi.list({ page: 1, pageSize: 100, order: 'asc', sort: 'name' }),
    staleTime: 60_000,
  })
}

export function useCreateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateCustomerInput) => customersApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useUpdateCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateCustomerInput }) => customersApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}

export function useDeleteCustomer() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => customersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customers'] }),
  })
}
