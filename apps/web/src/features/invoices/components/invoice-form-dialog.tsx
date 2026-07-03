'use client'

import { useState } from 'react'
import { createInvoiceSchema, updateInvoiceSchema } from '@admin/shared'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { centsFromAmount, amountFromCents } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { useCustomerOptions } from '@/features/customers/hooks'
import { useSubscriptionOptions } from '@/features/subscriptions/hooks'
import { useCreateInvoice, useUpdateInvoice } from '../hooks'
import type { Invoice, InvoiceStatus } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  invoice?: Invoice // undefined = create
}

const STATUSES: InvoiceStatus[] = ['DRAFT', 'OPEN', 'PAID', 'VOID', 'UNCOLLECTIBLE']
const title = (s: string) => s.charAt(0) + s.slice(1).toLowerCase()
const defaultDueDate = () => new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10)

export function InvoiceFormDialog({ open, onClose, invoice }: Props) {
  const toast = useToast()
  const isEdit = Boolean(invoice)
  const customers = useCustomerOptions()
  const createInvoice = useCreateInvoice()
  const updateInvoice = useUpdateInvoice()

  const [customerId, setCustomerId] = useState(invoice?.customerId ?? '')
  const [subscriptionId, setSubscriptionId] = useState(invoice?.subscriptionId ?? '')
  const [number, setNumber] = useState(invoice?.number ?? '')
  const [status, setStatus] = useState<InvoiceStatus>(invoice?.status ?? 'DRAFT')
  const [amount, setAmount] = useState(invoice ? amountFromCents(invoice.amountCents) : '0')
  const [currency, setCurrency] = useState(invoice?.currency ?? 'usd')
  const [dueDate, setDueDate] = useState(invoice ? invoice.dueDate.slice(0, 10) : defaultDueDate())
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)

  // Subscriptions are scoped to the invoice's customer (fixed on edit, chosen on create).
  const effectiveCustomerId = isEdit ? invoice?.customerId : customerId || undefined
  const subs = useSubscriptionOptions(effectiveCustomerId)
  const pending = createInvoice.isPending || updateInvoice.isPending
  const customerName = customers.data?.data.find((c) => c.id === invoice?.customerId)?.name

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const base: Record<string, unknown> = {
      status,
      amountCents: centsFromAmount(amount),
      currency,
      dueDate,
    }
    if (subscriptionId) base.subscriptionId = subscriptionId
    const onDone = {
      onSuccess: () => {
        toast.success(isEdit ? 'Invoice updated' : 'Invoice created')
        onClose()
      },
      onError: (err: unknown) => setFormError(errMsg(err)),
    }

    if (isEdit && invoice) {
      const parsed = updateInvoiceSchema.safeParse(base)
      if (!parsed.success) return setErrors(fieldErrs(parsed.error))
      setErrors({})
      updateInvoice.mutate({ id: invoice.id, body: parsed.data }, onDone)
      return
    }

    const parsed = createInvoiceSchema.safeParse({ ...base, customerId, number })
    if (!parsed.success) return setErrors(fieldErrs(parsed.error))
    setErrors({})
    createInvoice.mutate(parsed.data, onDone)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit ${invoice?.number}` : 'New invoice'}
      description={isEdit ? `Customer: ${customerName ?? '—'}` : 'Issue an invoice to a customer.'}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert variant="error">{formError}</Alert>}

        {!isEdit && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="customerId">Customer</Label>
              <Select
                id="customerId"
                value={customerId}
                onChange={(e) => {
                  setCustomerId(e.target.value)
                  setSubscriptionId('') // subs are customer-scoped — reset on change
                }}
                disabled={customers.isLoading}
                aria-invalid={errors.customerId ? true : undefined}
              >
                <option value="">Select a customer…</option>
                {customers.data?.data.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.email}
                  </option>
                ))}
              </Select>
              {errors.customerId && <p className="text-xs font-medium text-destructive">{errors.customerId}</p>}
            </div>
            <FormField
              label="Invoice number"
              name="number"
              placeholder="INV-1001"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              error={errors.number}
            />
          </>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="subscriptionId">Subscription (optional)</Label>
          <Select
            id="subscriptionId"
            value={subscriptionId}
            onChange={(e) => setSubscriptionId(e.target.value)}
            disabled={!effectiveCustomerId || subs.isLoading}
          >
            <option value="">No subscription</option>
            {subs.data?.data.map((s) => (
              <option key={s.id} value={s.id}>
                {title(s.plan)} · {title(s.interval)}
              </option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as InvoiceStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {title(s)}
                </option>
              ))}
            </Select>
          </div>
          <FormField
            label="Amount"
            name="amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={errors.amountCents}
          />
          <FormField
            label="Currency"
            name="currency"
            placeholder="usd"
            maxLength={3}
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            error={errors.currency}
          />
          <FormField
            label="Due date"
            name="dueDate"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            error={errors.dueDate}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create invoice'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function fieldErrs(error: import('zod').ZodError): Record<string, string | undefined> {
  const f = error.flatten().fieldErrors
  return {
    customerId: f.customerId?.[0],
    number: f.number?.[0],
    amountCents: f.amountCents?.[0],
    currency: f.currency?.[0],
    dueDate: f.dueDate?.[0],
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}
