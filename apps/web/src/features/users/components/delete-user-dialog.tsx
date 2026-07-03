'use client'

import { useState } from 'react'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Alert } from '@/components/ui/alert'
import { useToast } from '@/components/ui/toast'
import { useDeleteUser } from '../hooks'
import type { User } from '../types'

interface Props {
  user: User | null
  onClose: () => void
}

export function DeleteUserDialog({ user, onClose }: Props) {
  const toast = useToast()
  const deleteUser = useDeleteUser()
  const [error, setError] = useState<string | null>(null)

  const onConfirm = () => {
    if (!user) return
    setError(null)
    deleteUser.mutate(user.id, {
      onSuccess: () => {
        toast.success('User deleted', user.name ?? user.email)
        onClose()
      },
      // Server guards (last Admin, self) surface as a 403 message here.
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not delete this user.'),
    })
  }

  return (
    <Dialog
      open={Boolean(user)}
      onClose={onClose}
      title="Delete user"
      description="This permanently removes the account and its role assignments."
    >
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <p className="text-sm text-muted-foreground">
          Delete <span className="font-medium text-foreground">{user?.name ?? user?.email}</span>? This
          cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={deleteUser.isPending}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={onConfirm} loading={deleteUser.isPending}>
            Delete user
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
