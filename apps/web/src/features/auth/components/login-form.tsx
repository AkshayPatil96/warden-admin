'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Eye, EyeOff } from 'lucide-react'
import { loginRequestSchema } from '@admin/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { ApiError } from '@/lib/api-client'
import { useLogin } from '../hooks'

type FieldErrors = Partial<Record<'email' | 'password', string>>

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const login = useLogin()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState<string | null>(null)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const parsed = loginRequestSchema.safeParse({ email, password, rememberMe })
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors
      setErrors({ email: f.email?.[0], password: f.password?.[0] })
      return
    }
    setErrors({})

    login.mutate(parsed.data, {
      onSuccess: () => {
        // Only follow an internal path. Reject protocol-relative ("//evil.com")
        // and backslash ("/\\evil.com") forms that browsers treat as absolute —
        // otherwise ?next= is an open redirect.
        const next = params.get('next')
        router.replace(next && /^\/(?![/\\])/.test(next) ? next : '/')
      },
      onError: (err) => {
        // 401 here means bad credentials; the API returns a generic message by design.
        setFormError(
          err instanceof ApiError && err.status === 429
            ? 'Too many attempts. Please wait a moment and try again.'
            : err instanceof Error
              ? err.message
              : 'Unable to sign in. Please try again.'
        )
      },
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert variant="error">{formError}</Alert>}

      <FormField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
        autoFocus
      />

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-xs font-medium text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            className="pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs font-medium text-destructive">
            {errors.password}
          </p>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
          className="size-4 rounded border-input accent-primary"
        />
        Keep me signed in
      </label>

      <Button type="submit" size="lg" className="w-full" loading={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
