'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from './api'
import type { CreateInvoiceInput, ListInvoicesQuery, UpdateInvoiceInput } from './types'

export function useInvoices(query: ListInvoicesQuery) {
  return useQuery({
    queryKey: ['invoices', query],
    queryFn: () => invoicesApi.list(query),
    placeholderData: keepPreviousData,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateInvoiceInput) => invoicesApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useUpdateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateInvoiceInput }) => invoicesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => invoicesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['invoices'] }),
  })
}
