'use client'

import { useState } from 'react'
import { createSubscriptionSchema, updateSubscriptionSchema } from '@admin/shared'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { centsFromAmount, amountFromCents } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { useCustomerOptions } from '@/features/customers/hooks'
import { useCreateSubscription, useUpdateSubscription } from '../hooks'
import type { BillingInterval, Subscription, SubscriptionPlan, SubscriptionStatus } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  subscription?: Subscription // undefined = create
}

const PLANS: SubscriptionPlan[] = ['STARTER', 'PRO', 'ENTERPRISE']
const STATUSES: SubscriptionStatus[] = ['TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELED']
const INTERVALS: BillingInterval[] = ['MONTHLY', 'YEARLY']

const defaultPeriodEnd = () => new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10)

export function SubscriptionFormDialog({ open, onClose, subscription }: Props) {
  const toast = useToast()
  const isEdit = Boolean(subscription)
  const customers = useCustomerOptions()
  const createSub = useCreateSubscription()
  const updateSub = useUpdateSubscription()

  const [customerId, setCustomerId] = useState(subscription?.customerId ?? '')
  const [plan, setPlan] = useState<SubscriptionPlan>(subscription?.plan ?? 'STARTER')
  const [status, setStatus] = useState<SubscriptionStatus>(subscription?.status ?? 'TRIALING')
  const [interval, setInterval] = useState<BillingInterval>(subscription?.interval ?? 'MONTHLY')
  const [price, setPrice] = useState(subscription ? amountFromCents(subscription.priceCents) : '0')
  const [periodEnd, setPeriodEnd] = useState(
    subscription ? subscription.currentPeriodEnd.slice(0, 10) : defaultPeriodEnd()
  )
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const pending = createSub.isPending || updateSub.isPending
  const customerName = customers.data?.data.find((c) => c.id === subscription?.customerId)?.name

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    const common = {
      plan,
      status,
      interval,
      priceCents: centsFromAmount(price),
      currentPeriodEnd: periodEnd,
    }
    const onDone = {
      onSuccess: () => {
        toast.success(isEdit ? 'Subscription updated' : 'Subscription created')
        onClose()
      },
      onError: (err: unknown) => setFormError(errMsg(err)),
    }

    if (isEdit && subscription) {
      const parsed = updateSubscriptionSchema.safeParse(common)
      if (!parsed.success) return setErrors(fieldErrs(parsed.error))
      setErrors({})
      updateSub.mutate({ id: subscription.id, body: parsed.data }, onDone)
      return
    }

    const parsed = createSubscriptionSchema.safeParse({ ...common, customerId })
    if (!parsed.success) return setErrors(fieldErrs(parsed.error))
    setErrors({})
    createSub.mutate(parsed.data, onDone)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit subscription' : 'New subscription'}
      description={isEdit ? `Customer: ${customerName ?? '—'}` : 'Attach a plan to a customer.'}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert variant="error">{formError}</Alert>}

        {!isEdit && (
          <div className="space-y-1.5">
            <Label htmlFor="customerId">Customer</Label>
            <Select
              id="customerId"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
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
        )}

        <div className="grid grid-cols-2 gap-4">
          <EnumField label="Plan" value={plan} onChange={(v) => setPlan(v as SubscriptionPlan)} options={PLANS} />
          <EnumField label="Interval" value={interval} onChange={(v) => setInterval(v as BillingInterval)} options={INTERVALS} />
          <EnumField label="Status" value={status} onChange={(v) => setStatus(v as SubscriptionStatus)} options={STATUSES} />
          <FormField
            label="Price (USD)"
            name="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            error={errors.priceCents}
          />
        </div>

        <FormField
          label="Current period ends"
          name="currentPeriodEnd"
          type="date"
          value={periodEnd}
          onChange={(e) => setPeriodEnd(e.target.value)}
          error={errors.currentPeriodEnd}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create subscription'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function EnumField({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: readonly string[]
}) {
  const id = label.toLowerCase()
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o} value={o}>
            {o.charAt(0) + o.slice(1).toLowerCase().replace('_', ' ')}
          </option>
        ))}
      </Select>
    </div>
  )
}

function fieldErrs(error: import('zod').ZodError): Record<string, string | undefined> {
  const f = error.flatten().fieldErrors
  return {
    customerId: f.customerId?.[0],
    priceCents: f.priceCents?.[0],
    currentPeriodEnd: f.currentPeriodEnd?.[0],
  }
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}
