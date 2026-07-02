import { prisma } from '../../lib/prisma.js'
import type { DashboardKpis, LabelCount, RevenuePoint } from '@admin/shared'

// All queries below are constant SQL with no interpolation — no injection surface.
// Columns are quoted camelCase (Prisma's default, no @map); tables are snake_case.

export async function fetchKpis(): Promise<DashboardKpis> {
  const rows = await prisma.$queryRaw<
    Array<{
      total_mrr_cents: bigint
      active_customers: number
      active_subscriptions: number
      open_invoices_cents: bigint
    }>
  >`
    SELECT
      (SELECT COALESCE(SUM("mrrCents"), 0) FROM customers WHERE status = 'ACTIVE')::bigint AS total_mrr_cents,
      (SELECT COUNT(*) FROM customers WHERE status = 'ACTIVE')::int AS active_customers,
      (SELECT COUNT(*) FROM subscriptions WHERE status = 'ACTIVE')::int AS active_subscriptions,
      (SELECT COALESCE(SUM("amountCents"), 0) FROM invoices WHERE status = 'OPEN')::bigint AS open_invoices_cents
  `
  const r = rows[0]
  return {
    totalMrrCents: Number(r?.total_mrr_cents ?? 0),
    activeCustomers: Number(r?.active_customers ?? 0),
    activeSubscriptions: Number(r?.active_subscriptions ?? 0),
    openInvoicesCents: Number(r?.open_invoices_cents ?? 0),
  }
}

export async function fetchCustomersByStatus(): Promise<LabelCount[]> {
  const rows = await prisma.$queryRaw<Array<{ label: string; count: number }>>`
    SELECT status::text AS label, COUNT(*)::int AS count FROM customers GROUP BY status ORDER BY status
  `
  return rows.map((r) => ({ label: r.label, count: Number(r.count) }))
}

export async function fetchSubscriptionsByPlan(): Promise<LabelCount[]> {
  const rows = await prisma.$queryRaw<Array<{ label: string; count: number }>>`
    SELECT plan::text AS label, COUNT(*)::int AS count FROM subscriptions GROUP BY plan ORDER BY plan
  `
  return rows.map((r) => ({ label: r.label, count: Number(r.count) }))
}

export async function fetchInvoicesByStatus(): Promise<LabelCount[]> {
  const rows = await prisma.$queryRaw<Array<{ label: string; count: number }>>`
    SELECT status::text AS label, COUNT(*)::int AS count FROM invoices GROUP BY status ORDER BY status
  `
  return rows.map((r) => ({ label: r.label, count: Number(r.count) }))
}

// Gap-free 12-month series (months with no paid invoices come back as 0) via
// generate_series left-joined to paid invoices grouped by month.
export async function fetchRevenueTrend(): Promise<RevenuePoint[]> {
  const rows = await prisma.$queryRaw<Array<{ month: string; total_cents: bigint }>>`
    SELECT to_char(m, 'YYYY-MM') AS month,
           COALESCE(SUM(i."amountCents"), 0)::bigint AS total_cents
    FROM generate_series(
      date_trunc('month', now()) - interval '11 months',
      date_trunc('month', now()),
      interval '1 month'
    ) AS m
    LEFT JOIN invoices i
      ON date_trunc('month', i."paidAt") = m AND i.status = 'PAID'
    GROUP BY m
    ORDER BY m
  `
  return rows.map((r) => ({ month: r.month, totalCents: Number(r.total_cents) }))
}
