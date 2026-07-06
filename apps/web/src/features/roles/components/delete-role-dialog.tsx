'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { useDeleteRole } from '../hooks'
import type { Role } from '../types'

interface Props {
  role: Role | null
  onClose: () => void
}

export function DeleteRoleDialog({ role, onClose }: Props) {
  const toast = useToast()
  const deleteRole = useDeleteRole()
  const [error, setError] = useState<string | null>(null)

  const onConfirm = () => {
    if (!role) return
    setError(null)
    deleteRole.mutate(role.id, {
      onSuccess: () => {
        toast.success('Role deleted', role.name)
        onClose()
      },
      // Server guards (Admin role, still-assigned) surface as a 403 message here.
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not delete this role.'),
    })
  }

  return (
    <Dialog
      open={Boolean(role)}
      onClose={onClose}
      title="Delete role"
      description="This permanently removes the role. It cannot be assigned to users while it still exists."
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-medium text-foreground">{role?.name}</span>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={deleteRole.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={deleteRole.isPending}>
            Delete role
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
