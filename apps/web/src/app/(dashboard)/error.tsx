'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Error boundary scoped to the dashboard — keeps the shell (sidebar/topbar)
// intact and only replaces the page body.
export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="size-6" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">This page hit an error</h2>
          <p className="max-w-sm text-sm text-muted-foreground">
            We couldn&apos;t load this view. Try again.
          </p>
        </div>
        <Button onClick={reset}>Try again</Button>
      </CardContent>
    </Card>
  )
}
