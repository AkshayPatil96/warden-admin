import { describe, expect, it } from 'vitest'
import { navItems } from './nav-items'
import { hasPermission } from '@/lib/auth'

// Mirrors the nav filter in dashboard-shell: an item shows when it has no
// permission gate or the user holds it. This is UX gating only — the API enforces.
function visibleLabels(permissions: string[]): string[] {
  return navItems
    .filter((item) => !item.permission || hasPermission(permissions, item.permission))
    .map((item) => item.label)
}

// Matches the seeded roles.
const ADMIN = [
  'users:read',
  'users:write',
  'users:delete',
  'billing:read',
  'billing:write',
  'billing:delete',
  'audit:read',
  'settings:read',
  'settings:write',
]
const VIEWER = ['users:read', 'audit:read', 'billing:read']

describe('nav RBAC gating', () => {
  it('always shows ungated items', () => {
    expect(visibleLabels([])).toEqual(expect.arrayContaining(['Dashboard', 'Settings']))
  })

  it('hides Users & Roles from a Viewer (needs users:write) but shows it to an Admin', () => {
    expect(visibleLabels(VIEWER)).not.toContain('Users & Roles')
    expect(visibleLabels(ADMIN)).toContain('Users & Roles')
  })

  it('shows billing + audit sections to a Viewer', () => {
    expect(visibleLabels(VIEWER)).toEqual(
      expect.arrayContaining(['Customers', 'Subscriptions', 'Invoices', 'Audit Log'])
    )
  })
})
