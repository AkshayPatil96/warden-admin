'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { rolesApi } from './api'
import type { CreateRoleInput, UpdateRoleInput } from './types'

export function useRolesList() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => rolesApi.list(),
  })
}

export function usePermissions() {
  return useQuery({
    queryKey: ['permissions'],
    queryFn: () => rolesApi.permissions(),
    staleTime: 5 * 60_000,
  })
}

// Mutations invalidate both keys — the user form's role picker (roles) and any
// permission-catalog consumers stay in sync after a role is created/edited.
export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateRoleInput) => rolesApi.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRoleInput }) => rolesApi.update(id, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rolesApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['roles'] }),
  })
}
