'use client'

import { Users, CreditCard, Receipt, AlertCircle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useBillingTotals } from '../hooks'

const cards: { key: 'customers' | 'subscriptions' | 'invoices'; label: string; icon: LucideIcon }[] = [
  { key: 'customers', label: 'Customers', icon: Users },
  { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { key: 'invoices', label: 'Invoices', icon: Receipt },
]

export function KpiCards() {
  const { data, isLoading, isError, refetch, isFetching } = useBillingTotals()

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="size-5 text-destructive" />
            Couldn&apos;t load billing metrics.
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {cards.map(({ key, label, icon: Icon }) => (
        <Card key={key}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{label}</p>
              {isLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : (
                <p className="text-3xl font-semibold tabular-nums tracking-tight">
                  {data?.[key].toLocaleString() ?? '—'}
                </p>
              )}
            </div>
            <span className="flex size-11 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
