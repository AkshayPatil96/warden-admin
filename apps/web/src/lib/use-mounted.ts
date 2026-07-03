'use client'

import { useSyncExternalStore } from 'react'

const emptySubscribe = () => () => {}

// Returns false during SSR and the first client render, true after hydration.
// Lint-clean alternative to the useState+useEffect mount flag.
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )
}
