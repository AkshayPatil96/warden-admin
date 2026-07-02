'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

// Route-level error boundary. Catches render/data errors below the root layout.
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Client-side log; server logs (pino) capture the API side.
    console.error(error)
  }, [error])

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <span className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-6" />
      </span>
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Something went wrong</h2>
        <p className="max-w-sm text-sm text-muted-foreground">
          An unexpected error occurred. You can try again — if it keeps happening, please
          reach out.
        </p>
      </div>
      <Button onClick={reset}>Try again</Button>
    </div>
  )
}
