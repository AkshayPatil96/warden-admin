'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  return useMutation({ mutationFn: settingsApi.changePassword })
}
