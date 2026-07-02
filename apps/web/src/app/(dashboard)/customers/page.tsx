import type { Metadata } from 'next'
import { CustomersTable } from '@/features/customers/components/customers-table'

export const metadata: Metadata = { title: 'Customers · Warden Admin' }

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        <p className="text-sm text-muted-foreground">
          The people and companies you bill. Changes here are audited.
        </p>
      </div>
      <CustomersTable />
    </div>
  )
}
