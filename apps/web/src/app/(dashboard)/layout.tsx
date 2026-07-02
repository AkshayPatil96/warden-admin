import { DashboardShell } from '@/components/layout/dashboard-shell'

// Authed shell. The shell is a client component: it guards the session
// (redirects to /login on an expired cookie) and renders sidebar + topbar.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
