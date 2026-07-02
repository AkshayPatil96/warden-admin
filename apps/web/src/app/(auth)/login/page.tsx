import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/features/auth/components/login-form'

export const metadata: Metadata = { title: 'Sign in · Warden Admin' }

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
        <p className="text-sm text-muted-foreground">
          Welcome back. Enter your credentials to continue.
        </p>
      </div>
      <Suspense fallback={<div className="h-72" />}>
        <LoginForm />
      </Suspense>
      <DemoCredentials />
    </div>
  )
}

// Public demo logins are a spec requirement — surface them so a reviewer can
// log in as each role and see access control enforced.
function DemoCredentials() {
  const rows = [
    { role: 'Admin', email: 'admin@example.com' },
    { role: 'Manager', email: 'manager@example.com' },
    { role: 'Viewer', email: 'viewer@example.com' },
  ]
  return (
    <div className="rounded-md border border-dashed border-border bg-muted/40 p-4 text-sm">
      <p className="mb-2 font-medium text-foreground">Demo logins</p>
      <ul className="space-y-1 text-muted-foreground">
        {rows.map((r) => (
          <li key={r.email} className="flex justify-between gap-4">
            <span>{r.role}</span>
            <span className="font-mono text-xs">{r.email}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-muted-foreground">
        Password for all: <span className="font-mono">Password123!</span>
      </p>
    </div>
  )
}
