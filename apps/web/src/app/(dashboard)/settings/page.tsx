import type { Metadata } from 'next'
import { ProfileForm } from '@/features/settings/components/profile-form'
import { PasswordForm } from '@/features/settings/components/password-form'
import { ActiveSessions } from '@/features/settings/components/active-sessions'
import { AppearanceSection } from '@/features/settings/components/appearance-section'

export const metadata: Metadata = { title: 'Settings · Warden Admin' }

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your account and preferences.</p>
      </div>
      <div className="grid max-w-2xl gap-6">
        <ProfileForm />
        <PasswordForm />
        <ActiveSessions />
        <AppearanceSection />
      </div>
    </div>
  )
}
