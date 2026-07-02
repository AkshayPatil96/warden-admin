const dateFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso))
}

// Money is stored as integer cents. Format for display in the user's locale.
export function formatMoney(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents / 100)
}

// Form inputs are in whole currency units (dollars); the API wants integer cents.
export function centsFromAmount(amount: string | number): number {
  return Math.round(Number(amount) * 100)
}

export function amountFromCents(cents: number): string {
  return (cents / 100).toFixed(2)
}
