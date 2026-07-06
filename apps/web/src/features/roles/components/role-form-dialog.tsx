'use client'

import { useMemo, useState } from 'react'
import { createRoleSchema, updateRoleSchema } from '@admin/shared'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/toast'
import { useCreateRole, usePermissions, useUpdateRole } from '../hooks'
import type { Role } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  role?: Role // undefined = create mode
}

// Groups "resource:action" keys ("billing:read", "billing:write", ...) under
// their shared "resource" prefix so the picker reads as a permission matrix.
function groupByResource(keys: string[]): [string, string[]][] {
  const groups = new Map<string, string[]>()
  for (const key of keys) {
    const resource = key.split(':')[0] ?? key
    groups.set(resource, [...(groups.get(resource) ?? []), key])
  }
  return [...groups.entries()].sort(([a], [b]) => a.localeCompare(b))
}

export function RoleFormDialog({ open, onClose, role }: Props) {
  const toast = useToast()
  const isEdit = Boolean(role)
  const permissionsQuery = usePermissions()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()

  const [name, setName] = useState(role?.name ?? '')
  const [description, setDescription] = useState(role?.description ?? '')
  const [permissionKeys, setPermissionKeys] = useState<string[]>(role?.permissions ?? [])
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const pending = createRole.isPending || updateRole.isPending

  const keyToId = useMemo(() => {
    const map = new Map<string, string>()
    for (const p of permissionsQuery.data?.data ?? []) map.set(p.key, p.id)
    return map
  }, [permissionsQuery.data])

  const grouped = useMemo(
    () => groupByResource((permissionsQuery.data?.data ?? []).map((p) => p.key)),
    [permissionsQuery.data]
  )

  const togglePermission = (key: string) =>
    setPermissionKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]))

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const permissionIds = permissionKeys.map((k) => keyToId.get(k)).filter((id): id is string => Boolean(id))

    if (isEdit && role) {
      const parsed = updateRoleSchema.safeParse({
        name,
        description: description.trim() || null,
        permissionIds,
      })
      if (!parsed.success) {
        const f = parsed.error.flatten().fieldErrors
        setErrors({ name: f.name?.[0], permissionIds: f.permissionIds?.[0] })
        return
      }
      updateRole.mutate(
        { id: role.id, body: parsed.data },
        {
          onSuccess: () => {
            toast.success('Role updated', name)
            onClose()
          },
          onError: (err) => setFormError(errMsg(err)),
        }
      )
      return
    }

    const parsed = createRoleSchema.safeParse({ name, description: description.trim() || undefined, permissionIds })
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors
      setErrors({ name: f.name?.[0], permissionIds: f.permissionIds?.[0] })
      return
    }
    createRole.mutate(parsed.data, {
      onSuccess: () => {
        toast.success('Role created', name)
        onClose()
      },
      onError: (err) => setFormError(errMsg(err)),
    })
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit role' : 'New role'}
      description={isEdit ? role?.name : 'Bundle permissions into a reusable role.'}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert variant="error">{formError}</Alert>}

        <FormField
          label="Name"
          name="name"
          placeholder="e.g. Billing Support"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
        />

        <FormField
          label="Description"
          name="description"
          placeholder="What this role is for (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <div className="space-y-1.5">
          <Label>Permissions</Label>
          {permissionsQuery.isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          ) : (
            <div className="max-h-60 space-y-3 overflow-y-auto rounded-md border border-border p-3">
              {grouped.map(([resource, keys]) => (
                <div key={resource}>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {resource}
                  </p>
                  <div className="space-y-1">
                    {keys.map((key) => (
                      <label
                        key={key}
                        className="flex cursor-pointer items-center gap-3 rounded-sm px-2 py-1 hover:bg-accent/60"
                      >
                        <input
                          type="checkbox"
                          checked={permissionKeys.includes(key)}
                          onChange={() => togglePermission(key)}
                          className="size-4 rounded border-input accent-primary"
                        />
                        <span className="text-sm">{key}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {errors.permissionIds && <p className="text-xs font-medium text-destructive">{errors.permissionIds}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create role'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}
