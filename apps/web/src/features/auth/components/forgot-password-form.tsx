'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { forgotPasswordSchema } from '@admin/shared'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { useForgotPassword } from '../hooks'

export function ForgotPasswordForm() {
  const forgot = useForgotPassword()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | undefined>()

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = forgotPasswordSchema.safeParse({ email })
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.email?.[0])
      return
    }
    setError(undefined)
    forgot.mutate(parsed.data)
  }

  // The API always returns 204 (no account enumeration) — so success is the same
  // message whether or not the email exists.
  if (forgot.isSuccess) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          If an account exists for <strong>{email}</strong>, a password reset link is on its way.
          Check your inbox.
        </Alert>
        <Button type="button" variant="outline" className="w-full" onClick={() => forgot.reset()}>
          Send another link
        </Button>
        <BackToLogin />
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        autoFocus
      />
      <Button type="submit" size="lg" className="w-full" loading={forgot.isPending}>
        {forgot.isPending ? 'Sending…' : 'Send reset link'}
      </Button>
      <BackToLogin />
    </form>
  )
}

function BackToLogin() {
  return (
    <Link
      href="/login"
      className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
    >
      <ArrowLeft className="size-4" />
      Back to sign in
    </Link>
  )
}
