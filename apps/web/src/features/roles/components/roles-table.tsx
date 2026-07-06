'use client'

import { useState } from 'react'
import { AlertCircle, Pencil, Plus, Trash2 } from 'lucide-react'
import { hasPermission } from '@/lib/auth'
import { useMe } from '@/features/auth/hooks'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useRolesList } from '../hooks'
import type { Role } from '../types'
import { RoleFormDialog } from './role-form-dialog'
import { DeleteRoleDialog } from './delete-role-dialog'

// Roles are a small, unpaginated set (GET /roles returns everything) — a plain
// table is enough, no need for the paginated DataTable's page/size machinery.
export function RolesTable() {
  const { data: me } = useMe()
  const canWrite = me ? hasPermission(me.permissions, 'roles:write') : false
  const canDelete = me ? hasPermission(me.permissions, 'roles:delete') : false

  const { data, isLoading, isError, refetch } = useRolesList()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Role | undefined>(undefined)
  const [deleting, setDeleting] = useState<Role | null>(null)

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (role: Role) => {
    setEditing(role)
    setFormOpen(true)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Roles bundle permissions. Assign a role to a user to grant everything it holds.
        </p>
        {canWrite && (
          <Button onClick={openCreate}>
            <Plus className="size-4" />
            New role
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th scope="col" className="px-4 py-3 font-medium">
                  Name
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Description
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Permissions
                </th>
                {(canWrite || canDelete) && <th scope="col" className="w-0 px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, r) => (
                  <tr key={r} className="border-b border-border last:border-0">
                    <td className="px-4 py-3" colSpan={4}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <AlertCircle className="size-6 text-destructive" />
                      <p>Couldn&apos;t load roles.</p>
                      <Button variant="outline" size="sm" onClick={() => refetch()}>
                        Retry
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (data?.data.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-muted-foreground">
                    No roles yet.
                  </td>
                </tr>
              ) : (
                data?.data.map((role) => (
                  <tr key={role.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                    <td className="px-4 py-3 font-medium">{role.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{role.description ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.map((key) => (
                          <Badge key={key} variant="primary">
                            {key}
                          </Badge>
                        ))}
                      </div>
                    </td>
                    {(canWrite || canDelete) && (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit ${role.name}`}
                              onClick={() => openEdit(role)}
                            >
                              <Pencil className="size-4" />
                            </Button>
                          )}
                          {canDelete && (
                            <Button
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete ${role.name}`}
                              onClick={() => setDeleting(role)}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Keyed + mounted-on-open so each dialog initializes fresh from its target. */}
      {formOpen && (
        <RoleFormDialog key={editing?.id ?? 'new'} open onClose={() => setFormOpen(false)} role={editing} />
      )}
      {deleting && <DeleteRoleDialog key={deleting.id} role={deleting} onClose={() => setDeleting(null)} />}
    </div>
  )
}
