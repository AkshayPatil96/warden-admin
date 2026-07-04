'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'

interface Props {
  page: number
  pageSize: number
  total: number
  isLoading?: boolean
  onPageChange: (page: number) => void
  onPageSizeChange?: (size: number) => void
  pageSizeOptions?: number[]
}

export function DataTablePagination({
  page,
  pageSize,
  total,
  isLoading,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-col-reverse gap-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">Rows per page</span>
            <Select
              aria-label="Rows per page"
              className="h-8 w-[4.5rem] py-0"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </Select>
          </label>
        )}
        <span className="tabular-nums">
          {total === 0 ? 'No results' : `${from}–${to} of ${total.toLocaleString()}`}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="First page"
          onClick={() => onPageChange(1)}
          disabled={page <= 1 || isLoading}
        >
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-label="Previous page"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1 || isLoading}
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        <div className="flex items-center gap-1.5 px-1">
          <PageInput key={page} page={page} totalPages={totalPages} onCommit={onPageChange} />
          <span className="whitespace-nowrap tabular-nums">of {totalPages}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          aria-label="Next page"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages || isLoading}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="size-8"
          aria-label="Last page"
          onClick={() => onPageChange(totalPages)}
          disabled={page >= totalPages || isLoading}
        >
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

// Keyed on `page` by the parent so it reseeds when the page changes elsewhere —
// no setState-in-effect. Commits on Enter or blur, clamped to [1, totalPages].
function PageInput({
  page,
  totalPages,
  onCommit,
}: {
  page: number
  totalPages: number
  onCommit: (page: number) => void
}) {
  const [value, setValue] = useState(String(page))

  const commit = () => {
    const parsed = Number.parseInt(value, 10)
    const next = Math.min(Math.max(1, Number.isNaN(parsed) ? 1 : parsed), totalPages)
    setValue(String(next))
    if (next !== page) onCommit(next)
  }

  return (
    <input
      aria-label="Page number"
      inputMode="numeric"
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          commit()
          e.currentTarget.blur()
        }
      }}
      className="h-8 w-12 rounded-md border border-input bg-card px-2 text-center text-sm tabular-nums outline-none focus-visible:border-ring"
    />
  )
}
