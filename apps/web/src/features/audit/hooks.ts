'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { auditApi, type AuditQuery } from './api'

export function useAuditLogs(query: AuditQuery) {
  return useQuery({
    queryKey: ['audit', query],
    queryFn: () => auditApi.list(query),
    placeholderData: keepPreviousData,
  })
}
