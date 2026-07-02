import type { Metadata } from 'next'
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header'
import { KpiCards } from '@/features/dashboard/components/kpi-cards'
import { PermissionsPanel } from '@/features/dashboard/components/permissions-panel'

export const metadata: Metadata = { title: 'Dashboard · Warden Admin' }

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      <KpiCards />
      <PermissionsPanel />
    </div>
  )
}
