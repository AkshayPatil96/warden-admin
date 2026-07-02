'use client'

import type { AuditLog } from '@admin/shared'
import { Dialog } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

function JsonBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      {value == null ? (
        <p className="text-sm text-muted-foreground">—</p>
      ) : (
        <pre className="max-h-64 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
          {JSON.stringify(value, null, 2)}
        </pre>
      )}
    </div>
  )
}

export function AuditDetailDialog({ log, onClose }: { log: AuditLog | null; onClose: () => void }) {
  return (
    <Dialog
      open={Boolean(log)}
      onClose={onClose}
      title="Audit entry"
      description={log ? new Date(log.createdAt).toLocaleString() : undefined}
      className="max-w-2xl"
    >
      {log && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Actor</dt>
              <dd>{log.actorName ?? log.actorEmail ?? 'System'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Action</dt>
              <dd>
                <Badge variant="primary" className="font-mono">
                  {log.action}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Entity</dt>
              <dd className="capitalize">{log.entity}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">Entity ID</dt>
              <dd className="truncate font-mono text-xs">{log.entityId ?? '—'}</dd>
            </div>
          </dl>

          <div className="grid gap-4 sm:grid-cols-2">
            <JsonBlock label="Before" value={log.before} />
            <JsonBlock label="After" value={log.after} />
          </div>
        </div>
      )}
    </Dialog>
  )
}
