'use client'

import { useMe } from '@/features/auth/hooks'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

// Surfaces exactly what the signed-in user is allowed to do. Logging in as
// Admin vs Viewer shows a visibly different set — the RBAC model made tangible.
export function PermissionsPanel() {
  const { data: user, isLoading } = useMe()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Your access</CardTitle>
        <CardDescription>
          Permissions granted to your role. The API enforces these on every request.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !user ? (
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-24" />
            ))}
          </div>
        ) : user.permissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No permissions assigned.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {[...user.permissions].sort().map((p) => (
              <Badge key={p} variant="primary" className="font-mono">
                {p}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
