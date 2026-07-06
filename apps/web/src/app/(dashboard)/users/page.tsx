import type { Metadata } from 'next'
import { UsersAndRolesTabs } from '@/features/users/components/users-and-roles-tabs'

export const metadata: Metadata = { title: 'Users & Roles · Warden Admin' }

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Users &amp; Roles</h1>
        <p className="text-sm text-muted-foreground">
          Manage accounts, assign roles, and control access. Every change is audited.
        </p>
      </div>
      <UsersAndRolesTabs />
    </div>
  )
}
