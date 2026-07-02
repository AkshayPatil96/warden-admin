'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogout } from '@/features/auth/hooks'
import type { AuthUser } from '@/features/auth/types'

function initials(user: AuthUser): string {
  const source = user.name?.trim() || user.email
  return source.slice(0, 2).toUpperCase()
}

export function UserMenu({ user }: { user: AuthUser }) {
  const router = useRouter()
  const logout = useLogout()
  const [open, setOpen] = useState(false)

  const onLogout = () => {
    logout.mutate(undefined, { onSettled: () => router.replace('/login') })
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md p-1.5 hover:bg-accent"
      >
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
          {initials(user)}
        </span>
        <span className="hidden text-sm font-medium sm:inline">{user.name ?? user.email}</span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} aria-hidden />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-2 w-56 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{user.name ?? 'Account'}</p>
              <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            </div>
            <div className="my-1 h-px bg-border" />
            <button
              role="menuitem"
              onClick={onLogout}
              disabled={logout.isPending}
              className={cn(
                'flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm text-destructive transition-colors',
                'hover:bg-destructive/10 disabled:opacity-50'
              )}
            >
              <LogOut className="size-4" />
              {logout.isPending ? 'Signing out…' : 'Sign out'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
