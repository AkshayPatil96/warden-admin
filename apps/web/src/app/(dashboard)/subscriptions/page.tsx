import type { Metadata } from 'next'
import { SubscriptionsTable } from '@/features/subscriptions/components/subscriptions-table'

export const metadata: Metadata = { title: 'Subscriptions · Warden Admin' }

export default function SubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="text-sm text-muted-foreground">
          Plans attached to customers, with price and billing cadence. Changes here are audited.
        </p>
      </div>
      <SubscriptionsTable />
    </div>
  )
}
