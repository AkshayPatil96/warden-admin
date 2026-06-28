'use client'

import { ThemeProvider as NextThemes } from 'next-themes'
import type { ReactNode } from 'react'

// System-preference detection + persisted choice. `suppressHydrationWarning` on <html>
// plus next-themes' pre-hydration script prevents flash-of-wrong-theme.
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemes>
  )
}
