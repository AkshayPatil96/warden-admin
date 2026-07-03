'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { meKey } from '@/features/auth/hooks'
import type { AuthUser } from '@/features/auth/types'
import { settingsApi } from './api'

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsApi.updateProfile,
    // Refresh the cached user so the topbar/user menu update immediately.
    onSuccess: (user: AuthUser) => qc.setQueryData(meKey, user),
  })
}

export function useChangePassword() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsApi.changePassword,
    // A password change revokes other sessions — refresh the list.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useSessions() {
  return useQuery({ queryKey: ['sessions'], queryFn: () => settingsApi.listSessions(), staleTime: 30_000 })
}

export function useRevokeSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsApi.revokeSession,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}

export function useRevokeOtherSessions() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: settingsApi.revokeOtherSessions,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sessions'] }),
  })
}
