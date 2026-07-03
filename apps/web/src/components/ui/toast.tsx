'use client'

import { Toast } from '@base-ui-components/react/toast'
import { AlertCircle, CheckCircle2, Info, X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

const styles: Record<string, { border: string; icon: LucideIcon; color: string }> = {
  success: { border: 'border-l-success', icon: CheckCircle2, color: 'text-success' },
  error: { border: 'border-l-destructive', icon: AlertCircle, color: 'text-destructive' },
  info: { border: 'border-l-primary', icon: Info, color: 'text-primary' },
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider>
      {children}
      <Toast.Viewport className="fixed bottom-0 right-0 z-[100] flex w-full max-w-sm flex-col gap-2 p-4">
        <ToastList />
      </Toast.Viewport>
    </Toast.Provider>
  )
}

function ToastList() {
  const { toasts } = Toast.useToastManager()
  return toasts.map((toast) => {
    const style = styles[toast.type ?? 'info'] ?? styles.info
    const Icon = style.icon
    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          'flex items-start gap-3 rounded-md border border-l-4 border-border bg-popover p-4 text-sm text-popover-foreground shadow-lg transition-all',
          'data-[starting-style]:translate-x-full data-[ending-style]:translate-x-full data-[ending-style]:opacity-0',
          style.border
        )}
      >
        <Icon className={cn('mt-0.5 size-4 shrink-0', style.color)} aria-hidden />
        <div className="flex-1 space-y-0.5">
          <Toast.Title className="font-medium" />
          <Toast.Description className="text-muted-foreground" />
        </div>
        <Toast.Close
          aria-label="Dismiss"
          className="shrink-0 rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </Toast.Close>
      </Toast.Root>
    )
  })
}

// Convenience wrapper so callers do `const toast = useToast(); toast.success(...)`.
export function useToast() {
  const manager = Toast.useToastManager()
  return {
    success: (title: string, description?: string) => manager.add({ title, description, type: 'success' }),
    error: (title: string, description?: string) => manager.add({ title, description, type: 'error' }),
    info: (title: string, description?: string) => manager.add({ title, description, type: 'info' }),
  }
}
