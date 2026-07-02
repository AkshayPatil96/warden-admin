'use client'

import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

export interface Column<T> {
  /** Sort key — must match a backend-whitelisted field; omit for non-sortable columns. */
  key?: string
  header: string
  render: (row: T) => React.ReactNode
  className?: string
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
  rowKey: (row: T) => string
  emptyMessage?: string
  toolbar?: React.ReactNode
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
  rowKey,
  emptyMessage = 'No records found.',
  toolbar,
}: DataTableProps<T>) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="space-y-4">
      {toolbar}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                {columns.map((col, i) => {
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
                    {columns.map((_, c) => (
                      <td key={c} className="px-4 py-3">
                        <Skeleton className="h-4 w-24" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-12 text-center">
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
                  <td colSpan={columns.length} className="px-4 py-12 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={rowKey(row)} className="border-b border-border last:border-0 hover:bg-muted/40">
                    {columns.map((col, c) => (
                      <td key={c} className={cn('px-4 py-3', col.className)}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span className="tabular-nums">
          {total === 0 ? 'No results' : `${from}–${to} of ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1 || isLoading}
          >
            <ChevronLeft className="size-4" />
            Prev
          </Button>
          <span className="tabular-nums">
            Page {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages || isLoading}
          >
            Next
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
