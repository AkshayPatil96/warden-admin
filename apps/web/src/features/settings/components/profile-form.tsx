'use client'

import { useState } from 'react'
import { updateProfileSchema } from '@admin/shared'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/ui/form-field'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { useMe } from '@/features/auth/hooks'
import type { AuthUser } from '@/features/auth/types'
import { useUpdateProfile } from '../hooks'

export function ProfileForm() {
  const { data: me, isLoading } = useMe()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile</CardTitle>
        <CardDescription>Your name as it appears across the admin panel.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading || !me ? (
          <div className="space-y-4">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : (
          <ProfileFormInner key={me.id} user={me} />
        )}
      </CardContent>
    </Card>
  )
}

function ProfileFormInner({ user }: { user: AuthUser }) {
  const update = useUpdateProfile()
  const [name, setName] = useState(user.name ?? '')
  const [error, setError] = useState<string | undefined>()
  const [saved, setSaved] = useState(false)

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSaved(false)
    const parsed = updateProfileSchema.safeParse({ name })
    if (!parsed.success) {
      setError(parsed.error.flatten().fieldErrors.name?.[0])
      return
    }
    setError(undefined)
    update.mutate(parsed.data, {
      onSuccess: () => setSaved(true),
      onError: (err) => setError(err instanceof Error ? err.message : 'Could not update your profile.'),
    })
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {saved && <Alert variant="success">Profile updated.</Alert>}

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled readOnly />
        <p className="text-xs text-muted-foreground">Email changes aren’t supported yet.</p>
      </div>

      <FormField
        label="Name"
        name="name"
        value={name}
        onChange={(e) => {
          setName(e.target.value)
          setSaved(false)
        }}
        error={error}
      />

      <Button type="submit" loading={update.isPending} disabled={name === (user.name ?? '')}>
        Save changes
      </Button>
    </form>
  )
}
