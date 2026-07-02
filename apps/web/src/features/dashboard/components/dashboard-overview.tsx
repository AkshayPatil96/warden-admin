'use client'

import { AlertCircle, CreditCard, DollarSign, Receipt, Users, type LucideIcon } from 'lucide-react'
import type { DashboardKpis } from '@admin/shared'
import { formatMoney } from '@/lib/format'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { useDashboardSummary } from '../hooks'
import { BreakdownDonut, RevenueTrendChart } from './charts'

export function DashboardOverview() {
  const { data, isLoading, isError, refetch, isFetching } = useDashboardSummary()

  if (isError) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <AlertCircle className="size-5 text-destructive" />
            Couldn&apos;t load dashboard metrics.
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} loading={isFetching}>
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <KpiRow kpis={data?.kpis} loading={isLoading} />

      <Card>
        <CardHeader>
          <CardTitle>Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : <RevenueTrendChart data={data?.revenueTrend ?? []} />}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <DonutCard title="Customers by status" loading={isLoading} data={data?.customersByStatus} />
        <DonutCard title="Subscriptions by plan" loading={isLoading} data={data?.subscriptionsByPlan} />
        <DonutCard title="Invoices by status" loading={isLoading} data={data?.invoicesByStatus} />
      </div>
    </div>
  )
}

function KpiRow({ kpis, loading }: { kpis?: DashboardKpis; loading: boolean }) {
  const cards: { label: string; icon: LucideIcon; value: string }[] = [
    { label: 'Monthly recurring revenue', icon: DollarSign, value: kpis ? formatMoney(kpis.totalMrrCents) : '—' },
    { label: 'Active customers', icon: Users, value: kpis ? kpis.activeCustomers.toLocaleString() : '—' },
    { label: 'Active subscriptions', icon: CreditCard, value: kpis ? kpis.activeSubscriptions.toLocaleString() : '—' },
    { label: 'Open invoices', icon: Receipt, value: kpis ? formatMoney(kpis.openInvoicesCents) : '—' },
  ]

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(({ label, icon: Icon, value }) => (
        <Card key={label}>
          <CardContent className="flex items-center justify-between p-6">
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-medium text-muted-foreground">{label}</p>
              {loading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-2xl font-semibold tabular-nums tracking-tight">{value}</p>
              )}
            </div>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-5" />
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function DonutCard({
  title,
  data,
  loading,
}: {
  title: string
  data?: { label: string; count: number }[]
  loading: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-64 w-full" /> : <BreakdownDonut data={data ?? []} />}
      </CardContent>
    </Card>
  )
}
