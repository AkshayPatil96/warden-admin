'use client'

import { useState } from 'react'
import { changePasswordSchema } from '@admin/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { useChangePassword } from '../hooks'

export function PasswordForm() {
  const change = useChangePassword()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<{ current?: string; next?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setDone(false)

    if (next !== confirm) {
      setErrors({ confirm: 'Passwords do not match.' })
      return
    }
    const parsed = changePasswordSchema.safeParse({ currentPassword: current, newPassword: next })
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors
      setErrors({ current: f.currentPassword?.[0], next: f.newPassword?.[0] })
      return
    }
    setErrors({})

    change.mutate(parsed.data, {
      onSuccess: () => {
        setDone(true)
        setCurrent('')
        setNext('')
        setConfirm('')
      },
      onError: (err) => setFormError(err instanceof Error ? err.message : 'Could not change your password.'),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Password</CardTitle>
        <CardDescription>
          Changing your password signs you out of your other sessions.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} noValidate className="space-y-4">
          {done && <Alert variant="success">Password changed.</Alert>}
          {formError && <Alert variant="error">{formError}</Alert>}

          <FormField
            label="Current password"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            error={errors.current}
          />
          <FormField
            label="New password"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            error={errors.next}
            hint="At least 8 characters, with upper, lower, and a number."
          />
          <FormField
            label="Confirm new password"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            error={errors.confirm}
          />

          <Button type="submit" loading={change.isPending}>
            Change password
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
