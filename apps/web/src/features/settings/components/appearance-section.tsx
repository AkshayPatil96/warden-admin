'use client'

import { useTheme } from 'next-themes'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useMounted } from '@/lib/use-mounted'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function AppearanceSection() {
  const { theme, setTheme } = useTheme()
  const mounted = useMounted()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appearance</CardTitle>
        <CardDescription>Choose how the admin panel looks. Your choice is remembered.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid max-w-md grid-cols-3 gap-3" role="radiogroup" aria-label="Theme">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = mounted && theme === value
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setTheme(value)}
                className={cn(
                  'flex flex-col items-center gap-2 rounded-lg border p-4 text-sm font-medium transition-colors',
                  active
                    ? 'border-primary bg-accent text-accent-foreground'
                    : 'border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground'
                )}
              >
                <Icon className="size-5" />
                {label}
              </button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
