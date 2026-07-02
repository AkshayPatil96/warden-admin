'use client'

import { useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { hasPermission } from '@/lib/auth'
import { formatDate, formatMoney } from '@/lib/format'
import { useMe } from '@/features/auth/hooks'
import { DataTable, type Column } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge, type BadgeProps } from '@/components/ui/badge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useCustomers, useDeleteCustomer } from '../hooks'
import type { Customer, CustomerStatus, ListCustomersQuery } from '../types'
import { CustomerFormDialog } from './customer-form-dialog'

const statusVariant: Record<CustomerStatus, BadgeProps['variant']> = {
  ACTIVE: 'success',
  PAST_DUE: 'warning',
  CANCELED: 'danger',
}

export function CustomersTable() {
  const { data: me } = useMe()
  const canWrite = me ? hasPermission(me.permissions, 'billing:write') : false
  const canDelete = me ? hasPermission(me.permissions, 'billing:delete') : false

  const [query, setQuery] = useState<ListCustomersQuery>({
    page: 1,
    pageSize: 10,
    sort: 'createdAt',
    order: 'desc',
  })
  const [searchInput, setSearchInput] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | undefined>(undefined)
  const [deleting, setDeleting] = useState<Customer | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { data, isLoading, isError, isFetching, refetch } = useCustomers(query)
  const deleteCustomer = useDeleteCustomer()

  const onSortChange = (key: string) =>
    setQuery((q) => ({ ...q, page: 1, sort: key, order: q.sort === key && q.order === 'asc' ? 'desc' : 'asc' }))

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery((q) => ({ ...q, page: 1, search: searchInput.trim() || undefined }))
  }

  const confirmDelete = () => {
    if (!deleting) return
    setDeleteError(null)
    deleteCustomer.mutate(deleting.id, {
      onSuccess: () => setDeleting(null),
      onError: (err) => setDeleteError(err instanceof Error ? err.message : 'Could not delete this customer.'),
    })
  }

  const columns: Column<Customer>[] = [
    { key: 'name', header: 'Name', render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'email', header: 'Email', render: (c) => <span className="text-muted-foreground">{c.email}</span> },
    {
      header: 'Company',
      render: (c) => <span className="text-muted-foreground">{c.company ?? '—'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <Badge variant={statusVariant[c.status]}>{c.status.replace('_', ' ')}</Badge>,
    },
    {
      key: 'mrrCents',
      header: 'MRR',
      className: 'text-right tabular-nums',
      render: (c) => formatMoney(c.mrrCents),
    },
    {
      key: 'createdAt',
      header: 'Created',
      className: 'whitespace-nowrap',
      render: (c) => <span className="text-muted-foreground">{formatDate(c.createdAt)}</span>,
    },
  ]

  if (canWrite || canDelete) {
    columns.push({
      header: '',
      className: 'w-0 text-right',
      render: (c) => (
        <div className="flex justify-end gap-1">
          {canWrite && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${c.name}`}
              onClick={() => {
                setEditing(c)
                setFormOpen(true)
              }}
            >
              <Pencil className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" aria-label={`Delete ${c.name}`} onClick={() => setDeleting(c)}>
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
        <form onSubmit={onSearch} className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search name, email, company…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search customers"
          />
        </form>
        <Select
          aria-label="Filter by status"
          className="sm:w-44"
          value={query.status ?? ''}
          onChange={(e) =>
            setQuery((q) => ({ ...q, page: 1, status: (e.target.value || undefined) as ListCustomersQuery['status'] }))
          }
        >
          <option value="">All statuses</option>
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
          New customer
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
        rowKey={(c) => c.id}
        emptyMessage="No customers match your filters."
        toolbar={toolbar}
      />

      {formOpen && (
        <CustomerFormDialog
          key={editing?.id ?? 'new'}
          open
          onClose={() => setFormOpen(false)}
          customer={editing}
        />
      )}
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => {
          setDeleting(null)
          setDeleteError(null)
        }}
        onConfirm={confirmDelete}
        title="Delete customer"
        description={
          <>
            Delete <span className="font-medium text-foreground">{deleting?.name}</span>? This cannot be
            undone.
          </>
        }
        confirmLabel="Delete customer"
        loading={deleteCustomer.isPending}
        error={deleteError}
      />
    </>
  )
}
