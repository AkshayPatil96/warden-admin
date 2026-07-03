'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { hasPermission } from '@/lib/auth'
import { amountFromCents, formatDate, formatMoney } from '@/lib/format'
import { downloadCsv } from '@/lib/csv'
import { useRowSelection } from '@/lib/use-row-selection'
import { useMe } from '@/features/auth/hooks'
import { useCustomerOptions } from '@/features/customers/hooks'
import { DataTable, type BulkAction, type Column } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/components/ui/toast'
import { subscriptionsApi } from '../api'
import { useDeleteSubscription, useSubscriptions } from '../hooks'
import type { ListSubscriptionsQuery, Subscription, SubscriptionStatus } from '../types'
import { SubscriptionFormDialog } from './subscription-form-dialog'

const statusVariant: Record<SubscriptionStatus, BadgeProps['variant']> = {
  TRIALING: 'primary',
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELED: 'danger',
}

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace('_', ' ')

export function SubscriptionsTable() {
  const toast = useToast()
  const { data: me } = useMe()
  const canWrite = me ? hasPermission(me.permissions, 'billing:write') : false
  const canDelete = me ? hasPermission(me.permissions, 'billing:delete') : false

  const customers = useCustomerOptions()
  const customerName = (id: string) => customers.data?.data.find((c) => c.id === id)?.name ?? '—'

  const [query, setQuery] = useState<ListSubscriptionsQuery>({
    page: 1,
    pageSize: 10,
    sort: 'createdAt',
    order: 'desc',
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Subscription | undefined>(undefined)
  const [deleting, setDeleting] = useState<Subscription | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [bulkIds, setBulkIds] = useState<string[] | null>(null)
  const [bulkBusy, setBulkBusy] = useState(false)
  const [exporting, setExporting] = useState(false)

  const selection = useRowSelection()
  const { data, isLoading, isError, isFetching, refetch } = useSubscriptions(query)
  const deleteSub = useDeleteSubscription()

  const onSortChange = (key: string) =>
    setQuery((q) => ({ ...q, page: 1, sort: key, order: q.sort === key && q.order === 'asc' ? 'desc' : 'asc' }))

  const confirmDelete = () => {
    if (!deleting) return
    setDeleteError(null)
    deleteSub.mutate(deleting.id, {
      onSuccess: () => {
        toast.success('Subscription deleted')
        setDeleting(null)
      },
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Could not delete this subscription.'),
    })
  }

  const confirmBulkDelete = async () => {
    if (!bulkIds) return
    setBulkBusy(true)
    const results = await Promise.allSettled(bulkIds.map((id) => deleteSub.mutateAsync(id)))
    const ok = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.length - ok
    setBulkBusy(false)
    setBulkIds(null)
    selection.clear()
    if (failed === 0) toast.success('Deleted', `${ok} subscription${ok === 1 ? '' : 's'} deleted.`)
    else toast.error('Partly failed', `${ok} deleted, ${failed} failed.`)
  }

  const onExportCsv = async () => {
    setExporting(true)
    try {
      const all = await subscriptionsApi.list({ ...query, page: 1, pageSize: 1000 })
      downloadCsv(
        'subscriptions.csv',
        ['Customer', 'Plan', 'Status', 'Interval', 'Price', 'Period end'],
        all.data.map((s) => [
          customerName(s.customerId),
          s.plan,
          s.status,
          s.interval,
          amountFromCents(s.priceCents),
          s.currentPeriodEnd,
        ])
      )
      toast.success('Export ready', `${all.data.length} subscriptions exported.`)
    } catch {
      toast.error('Export failed', 'Could not export subscriptions.')
    } finally {
      setExporting(false)
    }
  }

  const bulkActions: BulkAction[] | undefined = canDelete
    ? [{ label: 'Delete', icon: Trash2, destructive: true, loading: bulkBusy, onClick: (ids) => setBulkIds(ids) }]
    : undefined

  const columns: Column<Subscription>[] = [
    { header: 'Customer', render: (s) => <span className="font-medium">{customerName(s.customerId)}</span> },
    { key: 'plan', header: 'Plan', render: (s) => <Badge variant="primary">{title(s.plan)}</Badge> },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <Badge variant={statusVariant[s.status]}>{title(s.status)}</Badge>,
    },
    { header: 'Interval', render: (s) => <span className="text-muted-foreground">{title(s.interval)}</span> },
    {
      key: 'priceCents',
      header: 'Price',
      className: 'text-right tabular-nums',
      render: (s) => formatMoney(s.priceCents),
    },
    {
      key: 'currentPeriodEnd',
      header: 'Period ends',
      className: 'whitespace-nowrap',
      render: (s) => <span className="text-muted-foreground">{formatDate(s.currentPeriodEnd)}</span>,
    },
  ]

  if (canWrite || canDelete) {
    columns.push({
      header: '',
      className: 'w-0 text-right',
      render: (s) => (
        <div className="flex justify-end gap-1">
          {canWrite && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Edit subscription"
              onClick={() => {
                setEditing(s)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" aria-label="Delete subscription" onClick={() => setDeleting(s)}>
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      ),
    })
  }

  const toolbar = (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Select
          aria-label="Filter by customer"
          className="sm:w-56"
          value={query.customerId ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, page: 1, customerId: e.target.value || undefined }))}
        >
          <option value="">All customers</option>
          {customers.data?.data.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by plan"
          className="sm:w-40"
          value={query.plan ?? ''}
          onChange={(e) =>
            setQuery((q) => ({ ...q, page: 1, plan: (e.target.value || undefined) as ListSubscriptionsQuery['plan'] }))
          }
        >
          <option value="">All plans</option>
          <option value="STARTER">Starter</option>
          <option value="PRO">Pro</option>
          <option value="ENTERPRISE">Enterprise</option>
        </Select>
        <Select
          aria-label="Filter by status"
          className="sm:w-40"
          value={query.status ?? ''}
          onChange={(e) =>
            setQuery((q) => ({ ...q, page: 1, status: (e.target.value || undefined) as ListSubscriptionsQuery['status'] }))
          }
        >
          <option value="">All statuses</option>
          <option value="TRIALING">Trialing</option>
          <option value="ACTIVE">Active</option>
          <option value="PAST_DUE">Past due</option>
          <option value="CANCELED">Canceled</option>
        </Select>
      </div>
      {canWrite && (
        <Button
          onClick={() => {
            setEditing(undefined)
            setFormOpen(true)
          }}
        >
          <Plus className="size-4" />
          New subscription
        </Button>
      )}
    </div>
  )

  return (
    <>
      <DataTable
        columns={columns}
        rows={data?.data ?? []}
        total={data?.total ?? 0}
        page={query.page}
        pageSize={query.pageSize}
        sort={query.sort}
        order={query.order}
        isLoading={isLoading || (isFetching && !data)}
        isError={isError}
        onRetry={() => refetch()}
        onSortChange={onSortChange}
        onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
        rowKey={(s) => s.id}
        emptyMessage="No subscriptions match your filters."
        toolbar={toolbar}
        selection={canDelete ? selection : undefined}
        bulkActions={bulkActions}
        enableColumnVisibility
        onExportCsv={onExportCsv}
        exporting={exporting}
      />

      {formOpen && (
        <SubscriptionFormDialog
          key={editing?.id ?? 'new'}
          open
          onClose={() => setFormOpen(false)}
          subscription={editing}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null)
          setDeleteError(null)
        }}
        onConfirm={confirmDelete}
        title="Delete subscription"
        description="This permanently removes the subscription. This cannot be undone."
        confirmLabel="Delete subscription"
        loading={deleteSub.isPending}
        error={deleteError}
      />
      <ConfirmDialog
        open={Boolean(bulkIds)}
        onClose={() => setBulkIds(null)}
        onConfirm={confirmBulkDelete}
        title="Delete subscriptions"
        description={`Delete ${bulkIds?.length ?? 0} selected subscription${bulkIds?.length === 1 ? '' : 's'}? This cannot be undone.`}
        confirmLabel="Delete"
        loading={bulkBusy}
      />
    </>
  )
}
