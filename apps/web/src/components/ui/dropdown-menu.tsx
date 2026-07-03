'use client'

import { Menu } from '@base-ui-components/react/menu'
import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const DropdownMenu = Menu.Root
export const DropdownMenuTrigger = Menu.Trigger

export function DropdownMenuContent({
  children,
  align = 'end',
  className,
}: {
  children: React.ReactNode
  align?: 'start' | 'center' | 'end'
  className?: string
}) {
  return (
    <Menu.Portal>
      <Menu.Positioner side="bottom" align={align} sideOffset={6} className="z-50">
        <Menu.Popup
          className={cn(
            'min-w-[12rem] origin-[var(--transform-origin)] rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg outline-none',
            'data-[starting-style]:scale-95 data-[starting-style]:opacity-0 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 transition-[transform,opacity]',
            className
          )}
        >
          {children}
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  )
}

export function DropdownMenuItem({ className, ...props }: React.ComponentProps<typeof Menu.Item>) {
  return (
    <Menu.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none',
        'data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        className
      )}
      {...props}
    />
  )
}

export function DropdownMenuCheckboxItem({
  checked,
  onCheckedChange,
  children,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  children: React.ReactNode
}) {
  return (
    <Menu.CheckboxItem
      checked={checked}
      onCheckedChange={(value) => onCheckedChange(value)}
      closeOnClick={false}
      className="flex cursor-pointer select-none items-center gap-2 rounded-sm px-3 py-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
    >
      <span className="flex size-4 items-center justify-center text-primary">
        <Menu.CheckboxItemIndicator>
          <Check className="size-4" />
        </Menu.CheckboxItemIndicator>
      </span>
      {children}
    </Menu.CheckboxItem>
  )
}

export function DropdownMenuLabel({ children }: { children: React.ReactNode }) {
  return <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground">{children}</div>
}

export function DropdownMenuSeparator() {
  return <Menu.Separator className="my-1 h-px bg-border" />
}
