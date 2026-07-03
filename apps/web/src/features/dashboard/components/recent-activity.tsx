'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { hasPermission } from '@/lib/auth'
import { useMe } from '@/features/auth/hooks'
import { auditApi } from '@/features/audit/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

const timeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function RecentActivity() {
  const { data: me } = useMe()
  const canRead = me ? hasPermission(me.permissions, 'audit:read') : false

  const { data, isLoading, isError } = useQuery({
    queryKey: ['dashboard', 'recent-activity'],
    queryFn: () => auditApi.list({ page: 1, pageSize: 6, order: 'desc' }),
    enabled: canRead,
    staleTime: 30_000,
  })

  if (!canRead) return null

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>The latest audited actions.</CardDescription>
        </div>
        <Link href="/audit" className="text-sm font-medium text-primary hover:underline">
          View all
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        ) : isError ? (
          <p className="text-sm text-muted-foreground">Couldn&apos;t load recent activity.</p>
        ) : data && data.data.length > 0 ? (
          <ul className="divide-y divide-border text-sm">
            {data.data.map((log) => (
              <li key={log.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="flex min-w-0 items-center gap-2">
                  <Badge variant="primary" className="shrink-0 font-mono">
                    {log.action}
                  </Badge>
                  <span className="truncate text-muted-foreground">
                    {log.actorName ?? log.actorEmail ?? 'System'}
                  </span>
                </div>
                <span className="shrink-0 whitespace-nowrap text-xs text-muted-foreground">
                  {timeFmt.format(new Date(log.createdAt))}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        )}
      </CardContent>
    </Card>
  )
}
