'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import { resetPasswordSchema } from '@admin/shared'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { useResetPassword } from '../hooks'

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter()
  const reset = useResetPassword()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)

  // No token in the URL → the link is malformed/expired. Don't show the form.
  if (!token) {
    return (
      <div className="space-y-4">
        <Alert variant="error">
          This password reset link is invalid or has expired. Request a new one to continue.
        </Alert>
        <Button onClick={() => router.push('/forgot-password')} className="w-full">
          Request a new link
        </Button>
      </div>
    )
  }

  if (reset.isSuccess) {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" aria-hidden />
        <p className="text-sm text-muted-foreground">
          Your password has been reset. You can now sign in with your new password.
        </p>
        <Button onClick={() => router.push('/login')} className="w-full">
          Go to sign in
        </Button>
      </div>
    )
  }

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (password !== confirm) {
      setErrors({ confirm: 'Passwords do not match.' })
      return
    }

    const parsed = resetPasswordSchema.safeParse({ token, password })
    if (!parsed.success) {
      setErrors({ password: parsed.error.flatten().fieldErrors.password?.[0] })
      return
    }
    setErrors({})

    reset.mutate(parsed.data, {
      onError: (err) => {
        setFormError(
          err instanceof Error
            ? err.message
            : 'Could not reset your password. The link may have expired.'
        )
      },
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}
      <FormField
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={errors.password}
        hint="At least 8 characters, with upper, lower, and a number."
        autoFocus
      />
      <FormField
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        error={errors.confirm}
      />
      <Button type="submit" size="lg" className="w-full" loading={reset.isPending}>
        {reset.isPending ? 'Resetting…' : 'Reset password'}
      </Button>
      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Back to sign in
      </Link>
    </form>
  )
}
