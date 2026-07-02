'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { LabelCount, RevenuePoint } from '@admin/shared'
import { formatMoney } from '@/lib/format'

// Categorical palette — distinguishable, readable in both themes.
const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#0ea5e9', '#a855f7']

const tooltipStyle = {
  background: 'var(--color-popover)',
  border: '1px solid var(--color-border)',
  borderRadius: '8px',
  color: 'var(--color-popover-foreground)',
  fontSize: '12px',
}

const axisTick = { fill: 'var(--color-muted-foreground)', fontSize: 12 }

const labelText = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ')

const monthShort = (month: string) =>
  new Date(`${month}-01T00:00:00`).toLocaleString(undefined, { month: 'short' })

const compactMoney = (cents: number) =>
  new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100)

function EmptyChart({ message }: { message: string }) {
  return (
    <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">{message}</div>
  )
}

export function RevenueTrendChart({ data }: { data: RevenuePoint[] }) {
  const hasData = data.some((d) => d.totalCents > 0)
  if (!hasData) return <EmptyChart message="No paid invoices in the last 12 months yet." />

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
        <XAxis dataKey="month" tickFormatter={monthShort} tick={axisTick} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={compactMoney} tick={axisTick} tickLine={false} axisLine={false} width={56} />
        <Tooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.5 }}
          contentStyle={tooltipStyle}
          formatter={(value) => [formatMoney(Number(value ?? 0)), 'Revenue'] as [string, string]}
          labelFormatter={(label) => monthShort(String(label ?? ''))}
        />
        <Bar dataKey="totalCents" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function BreakdownDonut({ data }: { data: LabelCount[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0)
  if (total === 0) return <EmptyChart message="No data yet." />

  const chartData = data.map((d) => ({ name: labelText(d.label), value: d.count }))

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
          {chartData.map((_, i) => (
            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="var(--color-card)" />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
