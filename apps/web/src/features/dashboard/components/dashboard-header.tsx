'use client'

import { useMe } from '@/features/auth/hooks'
import { Skeleton } from '@/components/ui/skeleton'

export function DashboardHeader() {
  const { data: user, isLoading } = useMe()

  return (
    <div className="space-y-1">
      {isLoading || !user ? (
        <Skeleton className="h-8 w-56" />
      ) : (
        <h1 className="text-2xl font-semibold tracking-tight">
          Welcome back{user.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h1>
      )}
      <p className="text-sm text-muted-foreground">
        Here&apos;s the current state of your billing operation.
      </p>
    </div>
  )
}
