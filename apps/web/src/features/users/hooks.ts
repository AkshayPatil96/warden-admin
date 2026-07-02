'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { usersApi } from './api'
import type { CreateUserInput, ListUsersQuery, UpdateUserInput } from './types'

const usersKey = (query: ListUsersQuery) => ['users', query] as const

export function useUsers(query: ListUsersQuery) {
  return useQuery({
    queryKey: usersKey(query),
    queryFn: () => usersApi.list(query),
    // Keep the previous page visible while the next one loads — no table flash.
    placeholderData: keepPreviousData,
  })
}

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => usersApi.roles(),
    staleTime: 5 * 60_000,
  })
}

// Mutations invalidate the users list so counts/rows refetch. A user table is
// small and infrequently mutated, so a refetch is simpler than hand-patching cache.
export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateUserInput) => usersApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateUserInput }) => usersApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}

export function useDeleteUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => usersApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })
}
