// Authed shell: sidebar + topbar + theme toggle. Compose layout components here.
// TODO: import Sidebar, Topbar from '@/components/layout' and guard for an active session.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      {/* TODO: <Sidebar /> */}
      <div className="flex-1">
        {/* TODO: <Topbar /> */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  )
}
