'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Menu, ShieldCheck, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { hasPermission } from '@/lib/auth'
import { useMe } from '@/features/auth/hooks'
import type { AuthUser } from '@/features/auth/types'
import { navItems } from './nav-items'
import { ThemeToggle } from './theme-toggle'
import { UserMenu } from './user-menu'

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { data: user, isLoading } = useMe()
  const [mobileOpen, setMobileOpen] = useState(false)

  // Client-side guard. Middleware already redirects when the cookie is absent;
  // this catches an expired/invalid session (cookie present but /me → 401).
  useEffect(() => {
    if (!isLoading && user === null) router.replace('/login')
  }, [isLoading, user, router])

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card lg:flex">
        <Brand />
        <Nav user={user} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <aside className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-border bg-card">
            <div className="flex items-center justify-between pr-2">
              <Brand />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-md p-2 text-muted-foreground hover:text-foreground"
              >
                <X className="size-5" />
              </button>
            </div>
            <Nav user={user} onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-2 border-b border-border bg-card/60 px-4 backdrop-blur">
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            className="rounded-md p-2 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <ThemeToggle />
          <UserMenu user={user} />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}

function Brand() {
  return (
    <Link href="/" className="flex h-16 items-center gap-2 border-b border-border px-6 font-semibold">
      <ShieldCheck className="size-6 text-primary" />
      Warden Admin
    </Link>
  )
}

function Nav({ user, onNavigate }: { user: AuthUser; onNavigate?: () => void }) {
  const pathname = usePathname()
  const items = navItems.filter((i) => !i.permission || hasPermission(user.permissions, i.permission))

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Primary">
      {items.map((item) => {
        const active = pathname === item.href
        const className = cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          active
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
          item.soon && 'cursor-not-allowed opacity-60 hover:bg-transparent hover:text-muted-foreground'
        )

        if (item.soon) {
          return (
            <div key={item.href} className={className} aria-disabled>
              <item.icon className="size-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Soon
              </span>
            </div>
          )
        }

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={className}
          >
            <item.icon className="size-4 shrink-0" />
            {item.label}
          </Link>
        )
      })}
    </nav>
  )
}
