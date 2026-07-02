import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { ThemeToggle } from '@/components/layout/theme-toggle'

// Split layout: a branded panel that sells the product (desktop), and the form
// card. The panel collapses on mobile so the form stays front and centre.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel — hidden on small screens */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-primary p-12 text-primary-foreground lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.15] [background-image:radial-gradient(circle_at_1px_1px,white_1px,transparent_0)] [background-size:24px_24px]"
        />
        <Link href="/" className="relative flex items-center gap-2 text-lg font-semibold">
          <ShieldCheck className="size-6" />
          Warden Admin
        </Link>
        <div className="relative space-y-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Run your billing operation with confidence.
          </h1>
          <p className="max-w-md text-primary-foreground/80">
            Customers, subscriptions, and invoices — with real role-based access control,
            audit trails, and the security controls a production console actually needs.
          </p>
        </div>
        <p className="relative text-sm text-primary-foreground/70">
          Demo logins are seeded for the Admin, Manager, and Viewer roles.
        </p>
      </aside>

      {/* Form side */}
      <main className="relative flex flex-col">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <Link
              href="/"
              className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden"
            >
              <ShieldCheck className="size-6 text-primary" />
              Warden Admin
            </Link>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
