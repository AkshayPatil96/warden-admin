'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi } from './api'
import type { CreateSubscriptionInput, ListSubscriptionsQuery, UpdateSubscriptionInput } from './types'

export function useSubscriptions(query: ListSubscriptionsQuery) {
  return useQuery({
    queryKey: ['subscriptions', query],
    queryFn: () => subscriptionsApi.list(query),
    placeholderData: keepPreviousData,
  })
}

// Options for the invoice subscription picker, scoped to one customer.
export function useSubscriptionOptions(customerId: string | undefined) {
  return useQuery({
    queryKey: ['subscriptions', 'options', customerId],
    queryFn: () =>
      subscriptionsApi.list({ page: 1, pageSize: 100, order: 'desc', sort: 'createdAt', customerId }),
    enabled: Boolean(customerId),
    staleTime: 60_000,
  })
}

export function useCreateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateSubscriptionInput) => subscriptionsApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateSubscriptionInput }) =>
      subscriptionsApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['subscriptions'] }),
  })
}
