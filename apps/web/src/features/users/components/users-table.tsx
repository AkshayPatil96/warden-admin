'use client'

import { useState } from 'react'
import { Pencil, Plus, Search, Trash2 } from 'lucide-react'
import { hasPermission } from '@/lib/auth'
import { useMe } from '@/features/auth/hooks'
import { DataTable, type Column } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useUsers } from '../hooks'
import type { ListUsersQuery, User } from '../types'
import { UserFormDialog } from './user-form-dialog'
import { DeleteUserDialog } from './delete-user-dialog'

const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function UsersTable() {
  const { data: me } = useMe()
  const canWrite = me ? hasPermission(me.permissions, 'users:write') : false
  const canDelete = me ? hasPermission(me.permissions, 'users:delete') : false

  const [query, setQuery] = useState<ListUsersQuery>({
    page: 1,
    pageSize: 10,
    sort: 'createdAt',
    order: 'desc',
  })
  const [searchInput, setSearchInput] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<User | undefined>(undefined)
  const [deleting, setDeleting] = useState<User | null>(null)

  const { data, isLoading, isError, isFetching, refetch } = useUsers(query)

  const onSortChange = (key: string) =>
    setQuery((q) => ({
      ...q,
      page: 1,
      sort: key,
      order: q.sort === key && q.order === 'asc' ? 'desc' : 'asc',
    }))

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery((q) => ({ ...q, page: 1, search: searchInput.trim() || undefined }))
  }

  const openCreate = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (user: User) => {
    setEditing(user)
    setFormOpen(true)
  }

  const columns: Column<User>[] = [
    {
      key: 'name',
      header: 'Name',
      render: (u) => <span className="font-medium">{u.name ?? '—'}</span>,
    },
    { key: 'email', header: 'Email', render: (u) => <span className="text-muted-foreground">{u.email}</span> },
    {
      header: 'Roles',
      render: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.length === 0 ? (
            <span className="text-muted-foreground">—</span>
          ) : (
            u.roles.map((r) => (
              <Badge key={r.id} variant="primary">
                {r.name}
              </Badge>
            ))
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (u) => (
        <Badge variant={u.status === 'ACTIVE' ? 'success' : 'warning'}>
          {u.status === 'ACTIVE' ? 'Active' : 'Suspended'}
        </Badge>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      className: 'whitespace-nowrap',
      render: (u) => <span className="text-muted-foreground">{dateFmt.format(new Date(u.createdAt))}</span>,
    },
  ]

  if (canWrite || canDelete) {
    columns.push({
      header: '',
      className: 'w-0 text-right',
      render: (u) => (
        <div className="flex justify-end gap-1">
          {canWrite && (
            <Button variant="ghost" size="icon" aria-label={`Edit ${u.email}`} onClick={() => openEdit(u)}>
              <Pencil className="size-4" />
            </Button>
          )}
          {canDelete && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${u.email}`}
              onClick={() => setDeleting(u)}
            >
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
            placeholder="Search name or email…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search users"
          />
        </form>
        <Select
          aria-label="Filter by status"
          className="sm:w-40"
          value={query.status ?? ''}
          onChange={(e) =>
            setQuery((q) => ({
              ...q,
              page: 1,
              status: (e.target.value || undefined) as ListUsersQuery['status'],
            }))
          }
        >
          <option value="">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="SUSPENDED">Suspended</option>
        </Select>
      </div>
      {canWrite && (
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          New user
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
        rowKey={(u) => u.id}
        emptyMessage="No users match your filters."
        toolbar={toolbar}
      />

      {/* Keyed + mounted-on-open so each dialog initializes fresh from its target. */}
      {formOpen && (
        <UserFormDialog
          key={editing?.id ?? 'new'}
          open
          onClose={() => setFormOpen(false)}
          user={editing}
        />
      )}
      {deleting && <DeleteUserDialog key={deleting.id} user={deleting} onClose={() => setDeleting(null)} />}
    </>
  )
}
