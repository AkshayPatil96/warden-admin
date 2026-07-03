'use client'

import { useState } from 'react'

export interface RowSelection {
  selectedIds: Set<string>
  isSelected: (id: string) => boolean
  toggle: (id: string) => void
  toggleMany: (ids: string[]) => void // toggle a set (used by the header select-all)
  clear: () => void
}

// Tracks selected row ids across pages. The table decides page-level all/some state.
export function useRowSelection(): RowSelection {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  return {
    selectedIds,
    isSelected: (id) => selectedIds.has(id),
    toggle: (id) =>
      setSelectedIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      }),
    toggleMany: (ids) =>
      setSelectedIds((prev) => {
        const allOn = ids.length > 0 && ids.every((id) => prev.has(id))
        const next = new Set(prev)
        for (const id of ids) {
          if (allOn) next.delete(id)
          else next.add(id)
        }
        return next
      }),
    clear: () => setSelectedIds(new Set()),
  }
}
