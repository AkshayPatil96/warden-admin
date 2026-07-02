import type { Metadata } from 'next'
import { AuditTable } from '@/features/audit/components/audit-table'

export const metadata: Metadata = { title: 'Audit Log · Warden Admin' }

export default function AuditPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Audit Log</h1>
        <p className="text-sm text-muted-foreground">
          Every sensitive action — who did it, when, and the before/after state.
        </p>
      </div>
      <AuditTable />
    </div>
  )
}
