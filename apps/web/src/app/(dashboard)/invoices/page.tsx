import type { Metadata } from 'next'
import { InvoicesTable } from '@/features/invoices/components/invoices-table'

export const metadata: Metadata = { title: 'Invoices · Warden Admin' }

export default function InvoicesPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
        <p className="text-sm text-muted-foreground">
          Amounts billed to customers, their status, and when they were paid. Changes here are audited.
        </p>
      </div>
      <InvoicesTable />
    </div>
  )
}
