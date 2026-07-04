'use client'

import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  AlertCircle,
  Download,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Checkbox } from '@/components/ui/checkbox'
import { DataTablePagination } from './pagination'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import type { RowSelection } from '@/lib/use-row-selection'

export interface Column<T> {
  /** Sort key — must match a backend-whitelisted field; omit for non-sortable columns. */
  key?: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
}

export interface BulkAction {
  label: string
  icon?: LucideIcon
  onClick: (ids: string[]) => void
  destructive?: boolean
  loading?: boolean
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  total: number
  page: number
  pageSize: number
  sort?: string
  order: 'asc' | 'desc'
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  onSortChange: (key: string) => void
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
  rowKey: (row: T) => string
  emptyMessage?: string
  toolbar?: React.ReactNode
  // Power features (all optional — omit for a plain table)
  selection?: RowSelection
  bulkActions?: BulkAction[]
  enableColumnVisibility?: boolean
  onExportCsv?: () => void
  exporting?: boolean
}

export function DataTable<T>({
  columns,
  rows,
  total,
  page,
  pageSize,
  sort,
  order,
  isLoading,
  isError,
  onRetry,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions,
  rowKey,
  emptyMessage = 'No records found.',
  toolbar,
  selection,
  bulkActions,
  enableColumnVisibility,
  onExportCsv,
  exporting,
}: DataTableProps<T>) {
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const visibleColumns = useMemo(
    () => columns.filter((c) => !c.header || !hidden.has(c.header)),
    [columns, hidden]
  )
  const hideableColumns = columns.filter((c) => c.header)

  const pageIds = rows.map(rowKey)
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selection?.isSelected(id))
  const someOnPageSelected = pageIds.some((id) => selection?.isSelected(id))
  const selectedCount = selection?.selectedIds.size ?? 0
  const colSpan = visibleColumns.length + (selection ? 1 : 0)

  const showControls = enableColumnVisibility || onExportCsv
  const showBulkBar = selection && selectedCount > 0

  return (
    <div className="space-y-4">
      {toolbar}

      {(showControls || showBulkBar) && (
        <div className="flex min-h-9 items-center justify-between gap-2">
          {showBulkBar ? (
            <>
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium tabular-nums">{selectedCount} selected</span>
                <button
                  onClick={() => selection?.clear()}
                  className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" /> Clear
                </button>
              </div>
              <div className="flex items-center gap-2">
                {bulkActions?.map((action) => (
                  <Button
                    key={action.label}
                    variant={action.destructive ? 'destructive' : 'outline'}
                    size="sm"
                    loading={action.loading}
                    onClick={() => action.onClick([...(selection?.selectedIds ?? [])])}
                  >
                    {action.icon && <action.icon className="size-4" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div />
              <div className="flex items-center gap-2">
                {enableColumnVisibility && hideableColumns.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={<Button variant="outline" size="sm" />}
                    >
                      <SlidersHorizontal className="size-4" />
                      Columns
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                      {hideableColumns.map((col) => (
                        <DropdownMenuCheckboxItem
                          key={col.header}
                          checked={!hidden.has(col.header)}
                          onCheckedChange={() =>
                            setHidden((prev) => {
                              const next = new Set(prev)
                              if (next.has(col.header)) next.delete(col.header)
                              else next.add(col.header)
                              return next
                            })
                          }
                        >
                          {col.header}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                {onExportCsv && (
                  <Button variant="outline" size="sm" onClick={onExportCsv} loading={exporting}>
                    <Download className="size-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {selection && (
                  <th scope="col" className="w-0 px-4 py-3">
                    <Checkbox
                      aria-label="Select all rows on this page"
                      checked={allOnPageSelected}
                      indeterminate={someOnPageSelected && !allOnPageSelected}
                      onCheckedChange={() => selection.toggleMany(pageIds)}
                    />
                  </th>
                )}
                {visibleColumns.map((col, i) => {
                  const active = col.key && sort === col.key
                  return (
                    <th
                      key={i}
                      scope="col"
                      aria-sort={active ? (order === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={cn('px-4 py-3 font-medium', col.className)}
                    >
                      {col.key ? (
                        <button
                          type="button"
                          onClick={() => onSortChange(col.key as string)}
                          className="inline-flex items-center gap-1.5 hover:text-foreground"
                        >
                          {col.header}
                          {active ? (
                            order === 'asc' ? (
                              <ArrowUp className="size-3.5" />
                            ) : (
                              <ArrowDown className="size-3.5" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3.5 opacity-40" />
                          )}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, r) => (
                  <tr key={r} className="border-b border-border last:border-0">
                    {Array.from({ length: colSpan }).map((_, c) => (
                      <td key={c} className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3 text-muted-foreground">
                      <AlertCircle className="size-6 text-destructive" />
                      <p>Couldn&apos;t load this data.</p>
                      {onRetry && (
                        <Button variant="outline" size="sm" onClick={onRetry}>
                          Retry
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-12 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const id = rowKey(row)
                  const selected = selection?.isSelected(id)
                  return (
                    <tr
                      key={id}
                      data-selected={selected || undefined}
                      className="border-b border-border last:border-0 hover:bg-muted/40 data-selected:bg-accent/40"
                    >
                      {selection && (
                        <td className="w-0 px-4 py-3">
                          <Checkbox
                            aria-label="Select row"
                            checked={selected}
                            onCheckedChange={() => selection.toggle(id)}
                          />
                        </td>
                      )}
                      {visibleColumns.map((col, c) => (
                        <td key={c} className={cn('px-4 py-3', col.className)}>
                          {col.render(row)}
                        </td>
                      ))}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DataTablePagination
        page={page}
        pageSize={pageSize}
        total={total}
        isLoading={isLoading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        pageSizeOptions={pageSizeOptions}
      />
    </div>
  )
}
