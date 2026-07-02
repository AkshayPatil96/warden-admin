// Response-only shapes for the dashboard analytics endpoint. Read-only aggregates,
// so these are plain types (no request validation needed) shared by API + web.

export interface DashboardKpis {
  totalMrrCents: number
  activeCustomers: number
  activeSubscriptions: number
  openInvoicesCents: number
}

export interface LabelCount {
  label: string
  count: number
}

export interface RevenuePoint {
  month: string // 'YYYY-MM'
  totalCents: number
}

export interface DashboardSummary {
  kpis: DashboardKpis
  customersByStatus: LabelCount[]
  subscriptionsByPlan: LabelCount[]
  invoicesByStatus: LabelCount[]
  revenueTrend: RevenuePoint[] // last 12 months of paid invoices
}
