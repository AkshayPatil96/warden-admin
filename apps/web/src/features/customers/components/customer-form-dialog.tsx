'use client'

import { useState } from 'react'
import { createCustomerSchema, updateCustomerSchema } from '@admin/shared'
import { Dialog } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { centsFromAmount, amountFromCents } from '@/lib/format'
import { useToast } from '@/components/ui/toast'
import { useCreateCustomer, useUpdateCustomer } from '../hooks'
import type { Customer, CustomerStatus } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  customer?: Customer // undefined = create
}

const STATUSES: CustomerStatus[] = ['ACTIVE', 'PAST_DUE', 'CANCELED']

export function CustomerFormDialog({ open, onClose, customer }: Props) {
  const toast = useToast()
  const isEdit = Boolean(customer)
  const createCustomer = useCreateCustomer()
  const updateCustomer = useUpdateCustomer()

  const [name, setName] = useState(customer?.name ?? '')
  const [email, setEmail] = useState(customer?.email ?? '')
  const [company, setCompany] = useState(customer?.company ?? '')
  const [status, setStatus] = useState<CustomerStatus>(customer?.status ?? 'ACTIVE')
  const [mrr, setMrr] = useState(customer ? amountFromCents(customer.mrrCents) : '0')
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const pending = createCustomer.isPending || updateCustomer.isPending

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const payload = {
      name,
      email,
      company: company.trim() || undefined,
      status,
      mrrCents: centsFromAmount(mrr),
    }
    const schema = isEdit ? updateCustomerSchema : createCustomerSchema
    const parsed = schema.safeParse(payload)
    if (!parsed.success) {
      const f = parsed.error.flatten().fieldErrors
      setErrors({ name: f.name?.[0], email: f.email?.[0], mrrCents: f.mrrCents?.[0] })
      return
    }
    setErrors({})

    const onDone = {
      onSuccess: () => {
        toast.success(isEdit ? 'Customer updated' : 'Customer created', name)
        onClose()
      },
      onError: (err: unknown) => setFormError(errMsg(err)),
    }
    if (isEdit && customer) {
      updateCustomer.mutate({ id: customer.id, body: parsed.data }, onDone)
    } else {
      createCustomer.mutate(parsed.data as never, onDone)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isEdit ? 'Edit customer' : 'New customer'}
      description={isEdit ? customer?.email : 'Add a customer to your billing account.'}
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        {formError && <Alert variant="error">{formError}</Alert>}

        <FormField
          label="Name"
          name="name"
          placeholder="Acme Inc."
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          autoFocus
        />
        <FormField
          label="Email"
          name="email"
          type="email"
          placeholder="billing@acme.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />
        <FormField
          label="Company"
          name="company"
          placeholder="Company (optional)"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value as CustomerStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s.replace('_', ' ')}
                </option>
              ))}
            </Select>
          </div>
          <FormField
            label="MRR (USD)"
            name="mrr"
            type="number"
            min="0"
            step="0.01"
            value={mrr}
            onChange={(e) => setMrr(e.target.value)}
            error={errors.mrrCents}
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            {isEdit ? 'Save changes' : 'Create customer'}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong. Please try again.'
}
