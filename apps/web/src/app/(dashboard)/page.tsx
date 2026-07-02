import type { Metadata } from 'next'
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header'
import { DashboardOverview } from '@/features/dashboard/components/dashboard-overview'
import { PermissionsPanel } from '@/features/dashboard/components/permissions-panel'

export const metadata: Metadata = { title: 'Dashboard · Warden Admin' }

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <DashboardHeader />
      <DashboardOverview />
      <PermissionsPanel />
    </div>
  )
}
