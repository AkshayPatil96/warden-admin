'use client'

import { Monitor } from 'lucide-react'
import type { SessionSummary } from '@admin/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { useRevokeOtherSessions, useRevokeSession, useSessions } from '../hooks'

const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function ActiveSessions() {
  const toast = useToast()
  const { data: sessions, isLoading, isError, refetch } = useSessions()
  const revoke = useRevokeSession()
  const revokeOthers = useRevokeOtherSessions()

  const hasOthers = (sessions?.length ?? 0) > 1

  const onRevoke = (session: SessionSummary) =>
    revoke.mutate(
      { id: session.id },
      {
        onSuccess: () => toast.success('Session revoked'),
        onError: (err) => toast.error('Could not revoke', err instanceof Error ? err.message : undefined),
      }
    )

  const onRevokeOthers = () =>
    revokeOthers.mutate(undefined, {
      onSuccess: (res) =>
        toast.success('Signed out other sessions', `${res.revoked} session${res.revoked === 1 ? '' : 's'} ended.`),
      onError: (err) => toast.error('Could not sign out others', err instanceof Error ? err.message : undefined),
    })

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-4 space-y-0">
        <div className="space-y-1.5">
          <CardTitle>Active sessions</CardTitle>
          <CardDescription>Devices where you&apos;re currently signed in.</CardDescription>
        </div>
        {hasOthers && (
          <Button variant="outline" size="sm" onClick={onRevokeOthers} loading={revokeOthers.isPending}>
            Sign out others
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full" />
            ))}
          </div>
        ) : isError ? (
          <Alert variant="error">
            Couldn&apos;t load your sessions.{' '}
            <button className="underline" onClick={() => refetch()}>
              Retry
            </button>
          </Alert>
        ) : (
          <ul className="divide-y divide-border">
            {sessions?.map((session) => (
              <li key={session.id} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                    <Monitor className="size-4" />
                  </span>
                  <div className="text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Session</span>
                      {session.current && <Badge variant="success">This device</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Started {dateTimeFmt.format(new Date(session.createdAt))} · expires{' '}
                      {dateTimeFmt.format(new Date(session.expiresAt))}
                    </p>
                  </div>
                </div>
                {!session.current && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10"
                    onClick={() => onRevoke(session)}
                    loading={revoke.isPending && revoke.variables?.id === session.id}
                  >
                    Revoke
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
