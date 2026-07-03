'use client'

import { Checkbox as BaseCheckbox } from '@base-ui-components/react/checkbox'
import { Check, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckboxProps {
  checked?: boolean
  indeterminate?: boolean
  onCheckedChange?: (checked: boolean) => void
  disabled?: boolean
  className?: string
  'aria-label'?: string
}

export function Checkbox({
  checked,
  indeterminate,
  onCheckedChange,
  disabled,
  className,
  ...props
}: CheckboxProps) {
  return (
    <BaseCheckbox.Root
      checked={checked}
      indeterminate={indeterminate}
      onCheckedChange={(value) => onCheckedChange?.(value)}
      disabled={disabled}
      className={cn(
        'flex size-4 shrink-0 items-center justify-center rounded border border-input bg-card outline-none transition-colors',
        'data-[checked]:border-primary data-[checked]:bg-primary data-[indeterminate]:border-primary data-[indeterminate]:bg-primary',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className
      )}
      {...props}
    >
      <BaseCheckbox.Indicator
        keepMounted
        className="text-primary-foreground data-[unchecked]:hidden"
      >
        {indeterminate ? <Minus className="size-3" /> : <Check className="size-3" />}
      </BaseCheckbox.Indicator>
    </BaseCheckbox.Root>
  )
}
