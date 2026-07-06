'use client'

import { useState } from 'react'
import { Eye, Search } from 'lucide-react'
import type { AuditLog } from '@admin/shared'
import { DataTable, type Column } from '@/components/data-table/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { downloadCsv } from '@/lib/csv'
import { useAuditLogs } from '../hooks'
import { auditApi, type AuditQuery } from '../api'
import { AuditDetailDialog } from './audit-detail-dialog'

const dateTimeFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

// Matches the entity values the audit writers emit (grep: entity: '...').
const ENTITIES = ['user', 'role', 'session', 'customer', 'subscription', 'invoice']

export function AuditTable() {
  const toast = useToast()
  const [query, setQuery] = useState<AuditQuery>({ page: 1, pageSize: 15, sort: 'createdAt', order: 'desc' })
  const [searchInput, setSearchInput] = useState('')
  const [detail, setDetail] = useState<AuditLog | null>(null)
  const [exporting, setExporting] = useState(false)

  const { data, isLoading, isError, isFetching, refetch } = useAuditLogs(query)

  const onExportCsv = async () => {
    setExporting(true)
    try {
      const all = await auditApi.list({ ...query, page: 1, pageSize: 1000 })
      downloadCsv(
        'audit-log.csv',
        ['Time', 'Actor', 'Action', 'Entity', 'Entity ID'],
        all.data.map((l) => [
          l.createdAt,
          l.actorName ?? l.actorEmail ?? 'System',
          l.action,
          l.entity,
          l.entityId ?? '',
        ])
      )
      toast.success('Export ready', `${all.data.length} entries exported.`)
    } catch {
      toast.error('Export failed', 'Could not export the audit log.')
    } finally {
      setExporting(false)
    }
  }

  const onSortChange = (key: string) =>
    setQuery((q) => ({ ...q, page: 1, sort: key, order: q.sort === key && q.order === 'asc' ? 'desc' : 'asc' }))

  const onSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setQuery((q) => ({ ...q, page: 1, search: searchInput.trim() || undefined }))
  }

  const columns: Column<AuditLog>[] = [
    {
      key: 'createdAt',
      header: 'Time',
      className: 'whitespace-nowrap',
      render: (l) => <span className="text-muted-foreground">{dateTimeFmt.format(new Date(l.createdAt))}</span>,
    },
    {
      header: 'Actor',
      render: (l) => <span className="font-medium">{l.actorName ?? l.actorEmail ?? 'System'}</span>,
    },
    {
      key: 'action',
      header: 'Action',
      render: (l) => (
        <Badge variant="primary" className="font-mono">
          {l.action}
        </Badge>
      ),
    },
    { key: 'entity', header: 'Entity', render: (l) => <span className="capitalize">{l.entity}</span> },
    {
      header: '',
      className: 'w-0 text-right',
      render: (l) => (
        <Button variant="ghost" size="icon" aria-label="View audit entry" onClick={() => setDetail(l)}>
          <Eye className="size-4" />
        </Button>
      ),
    },
  ]

  const toolbar = (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <form onSubmit={onSearch} className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search action or entity id…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-9"
            aria-label="Search audit log"
          />
        </form>
        <Select
          aria-label="Filter by entity"
          className="sm:w-44"
          value={query.entity ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, page: 1, entity: e.target.value || undefined }))}
        >
          <option value="">All entities</option>
          {ENTITIES.map((en) => (
            <option key={en} value={en} className="capitalize">
              {en}
            </option>
          ))}
        </Select>
        <Input
          type="date"
          aria-label="From date"
          className="sm:w-40"
          value={query.from ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, page: 1, from: e.target.value || undefined }))}
        />
        <Input
          type="date"
          aria-label="To date"
          className="sm:w-40"
          value={query.to ?? ''}
          onChange={(e) => setQuery((q) => ({ ...q, page: 1, to: e.target.value || undefined }))}
        />
      </div>
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
        onPageSizeChange={(pageSize) => setQuery((q) => ({ ...q, page: 1, pageSize }))}
        rowKey={(l) => l.id}
        emptyMessage="No audit entries match your filters."
        toolbar={toolbar}
        enableColumnVisibility
        onExportCsv={onExportCsv}
        exporting={exporting}
      />
      <AuditDetailDialog log={detail} onClose={() => setDetail(null)} />
    </>
  )
}
