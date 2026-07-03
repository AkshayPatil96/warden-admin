'use client'

import { useState } from 'react'
import { createUserSchema, updateUserSchema } from '@admin/shared'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useCreateUser, useRoles, useUpdateUser } from '../hooks'
import type { User } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  user?: User // undefined = create mode
}

export function UserFormDialog({ open, onClose, user }: Props) {
  const toast = useToast()
  const isEdit = Boolean(user)
  const rolesQuery = useRoles()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()

  const [email, setEmail] = useState(user?.email ?? '')
  const [name, setName] = useState(user?.name ?? '')
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>(user?.status ?? 'ACTIVE')
  const [roleIds, setRoleIds] = useState<string[]>(user?.roles.map((r) => r.id) ?? [])
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const pending = createUser.isPending || updateUser.isPending

  const toggleRole = (id: string) =>
    setRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (isEdit && user) {
      const parsed = updateUserSchema.safeParse({ name: name.trim() || null, status, roleIds })
      if (!parsed.success) {
        const f = parsed.error.flatten().fieldErrors
        setErrors({ name: f.name?.[0], roleIds: f.roleIds?.[0] })
        return
      }
      updateUser.mutate(
        { id: user.id, body: parsed.data },
        {
          onSuccess: () => {
            toast.success('User updated', email)
            onClose()
          },
          onError: (err) => setFormError(errMsg(err)),
        }
      )
      return
    }

    const parsed = createUserSchema.safeParse({
      email,
      name: name.trim() || undefined,
      password,
      roleIds,
    })
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors
      setErrors({ email: f.email?.[0], password: f.password?.[0], roleIds: f.roleIds?.[0] })
      return
    }
    createUser.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('User created', email)
        onClose()
      },
      onError: (err) => setFormError(errMsg(err)),
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit user' : 'New user'}
      description={isEdit ? user?.email : 'Create an account and assign roles.'}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert variant="error">{formError}</Alert>}

        {!isEdit && (
          <FormField
            label="Email"
            name="email"
            type="email"
            autoComplete="off"
            placeholder="person@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoFocus
          />
        )}

        <FormField
          label="Name"
          name="name"
          placeholder="Full name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

        {!isEdit && (
          <FormField
            label="Initial password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            hint="At least 8 characters, with upper, lower, and a number. The user can change it later."
          />
        )}

        {isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'ACTIVE' | 'SUSPENDED')}
            >
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label>Roles</Label>
          {rolesQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <div className="max-h-44 space-y-1 overflow-y-auto rounded-md border border-border p-1">
              {rolesQuery.data?.data.map((role) => (
                <label
                  key={role.id}
                  className="flex cursor-pointer items-start gap-3 rounded-sm px-2 py-1.5 hover:bg-accent/60"
                >
                  <input
                    type="checkbox"
                    checked={roleIds.includes(role.id)}
                    onChange={() => toggleRole(role.id)}
                    className="mt-0.5 size-4 rounded border-input accent-primary"
                  />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{role.name}</span>
                    {role.description && (
                      <span className="block text-xs text-muted-foreground">{role.description}</span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          )}
          {errors.roleIds && <p className="text-xs font-medium text-destructive">{errors.roleIds}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create user'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}
