'use client'

import { Dialog } from './dialog'
import { Button } from './button'
import { Alert } from './alert'

interface ConfirmDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description?: React.ReactNode
  confirmLabel?: string
  loading?: boolean
  error?: string | null
  destructive?: boolean
}

// Presentational confirm dialog. The caller owns the mutation and passes loading/error.
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  loading,
  error,
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title={title}>
      <div className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant={destructive ? 'destructive' : 'primary'} onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Dialog>
  )
}
