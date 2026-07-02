'use client'

import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { hasPermission } from '@/lib/auth'
import { formatDate, formatMoney } from '@/lib/format'
import { useMe } from '@/features/auth/hooks'
import { useCustomerOptions } from '@/features/customers/hooks'
import { DataTable, type Column } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useDeleteInvoice, useInvoices } from '../hooks'
import type { Invoice, InvoiceStatus, ListInvoicesQuery } from '../types'
import { InvoiceFormDialog } from './invoice-form-dialog'

const statusVariant: Record<InvoiceStatus, BadgeProps['variant']> = {
  DRAFT: 'neutral',
  OPEN: 'primary',
  PAID: 'success',
  VOID: 'neutral',
  UNCOLLECTIBLE: 'danger',
}

const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()

export function InvoicesTable() {
  const { data: me } = useMe()
  const canWrite = me ? hasPermission(me.permissions, 'billing:write') : false
  const canDelete = me ? hasPermission(me.permissions, 'billing:delete') : false

  const customers = useCustomerOptions()
  const customerName = (id: string) => customers.data?.data.find((c) => c.id === id)?.name ?? '—'

  const [query, setQuery] = useState<ListInvoicesQuery>({
    page: 1,
    pageSize: 10,
    sort: 'createdAt',
    order: 'desc',
  })
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Invoice | undefined>(undefined)
  const [deleting, setDeleting] = useState<Invoice | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, isLoading, isError, isFetching, refetch } = useInvoices(query)
  const deleteInvoice = useDeleteInvoice()

  const onSortChange = (key: string) =>
    setQuery((q) => ({ ...q, page: 1, sort: key, order: q.sort === key && q.order === 'asc' ? 'desc' : 'asc' }))

  const confirmDelete = () => {
    if (!deleting) return
    setDeleteError(null)
    deleteInvoice.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Could not delete this invoice.'),
    })
  }

  const columns: Column<Invoice>[] = [
    { key: 'number', header: 'Number', render: (i) => <span className="font-medium tabular-nums">{i.number}</span> },
    { header: 'Customer', render: (i) => <span className="text-muted-foreground">{customerName(i.customerId)}</span> },
    {
      key: 'status',
      header: 'Status',
      render: (i) => <Badge variant={statusVariant[i.status]}>{title(i.status)}</Badge>,
    },
    {
      key: 'amountCents',
      header: 'Amount',
      className: 'text-right tabular-nums',
      render: (i) => formatMoney(i.amountCents, i.currency),
    },
    {
      key: 'dueDate',
      header: 'Due',
      className: 'whitespace-nowrap',
      render: (i) => <span className="text-muted-foreground">{formatDate(i.dueDate)}</span>,
    },
    {
      header: 'Paid',
      className: 'whitespace-nowrap',
      render: (i) => (
        <span className="text-muted-foreground">{i.paidAt ? formatDate(i.paidAt) : '—'}</span>
      ),
    },
  ]

  if (canWrite || canDelete) {
    columns.push({
      header: '',
      className: 'w-0 text-right',
      render: (i) => (
        <div className="flex justify-end gap-1">
          {canWrite && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${i.number}`}
              onClick={() => {
                setEditing(i)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" aria-label={`Delete ${i.number}`} onClick={() => setDeleting(i)}>
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
          aria-label="Filter by status"
          className="sm:w-44"
          value={query.status ?? ''}
          onChange={(e) =>
            setQuery((q) => ({ ...q, page: 1, status: (e.target.value || undefined) as ListInvoicesQuery['status'] }))
          }
        >
          <option value="">All statuses</option>
          {['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE'].map((s) => (
            <option key={s} value={s}>
              {title(s)}
            </option>
          ))}
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
          New invoice
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
        rowKey={(i) => i.id}
        emptyMessage="No invoices match your filters."
        toolbar={toolbar}
      />

      {formOpen && (
        <InvoiceFormDialog key={editing?.id ?? 'new'} open onClose={() => setFormOpen(false)} invoice={editing} />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null)
          setDeleteError(null)
        }}
        onConfirm={confirmDelete}
        title="Delete invoice"
        description={
          <>
            Delete <span className="font-medium text-foreground">{deleting?.number}</span>? This cannot be
            undone.
          </>
        }
        confirmLabel="Delete invoice"
        loading={deleteInvoice.isPending}
        error={deleteError}
      />
    </>
  )
}
