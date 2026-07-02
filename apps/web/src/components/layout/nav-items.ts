import {
  LayoutDashboard,
  Users,
  CreditCard,
  Receipt,
  UserCog,
  ScrollText,
  Settings,
  type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** UI gate only — hidden if the user lacks this permission. API still enforces. */
  permission?: string
  /** Route not built yet — shown disabled so the product shape is visible without faking a page. */
  soon?: boolean
}

// Permission gates make the sidebar visibly differ per role: a Viewer (no
// users:write / settings:read) sees fewer items than an Admin. That difference
// is the whole point of the RBAC demo.
export const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Customers', href: '/customers', icon: Users, permission: 'billing:read', soon: true },
  { label: 'Subscriptions', href: '/subscriptions', icon: CreditCard, permission: 'billing:read', soon: true },
  { label: 'Invoices', href: '/invoices', icon: Receipt, permission: 'billing:read', soon: true },
  { label: 'Users & Roles', href: '/users', icon: UserCog, permission: 'users:write', soon: true },
  { label: 'Audit Log', href: '/audit', icon: ScrollText, permission: 'audit:read', soon: true },
  { label: 'Settings', href: '/settings', icon: Settings, permission: 'settings:read', soon: true },
]
