'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { RolesTable } from '@/features/roles/components/roles-table'
import { UsersTable } from './users-table'

const TABS = ['users', 'roles'] as const
type Tab = (typeof TABS)[number]

const TAB_LABELS: Record<Tab, string> = { users: 'Users', roles: 'Roles' }

export function UsersAndRolesTabs() {
  const [tab, setTab] = useState<Tab>('users')

  return (
    <div className="space-y-6">
      <div role="tablist" className="flex gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'border-b-2 px-3 pb-2 text-sm font-medium transition-colors',
              tab === t
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {tab === 'users' ? <UsersTable /> : <RolesTable />}
    </div>
  )
}
