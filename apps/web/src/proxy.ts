import { NextResponse, type NextRequest } from 'next/server'

// Session cookie set by the API (apps/api/src/lib/session.ts: SESSION_COOKIE).
const SESSION_COOKIE = 'admin_session'

// Routes that don't require a session. Everything else is protected.
const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password']

// Cookie presence ≠ valid session — it's httpOnly so the proxy can't verify it.
// This is a cheap UX redirect; the client guard (useMe → 401) and the API are
// the real enforcement. Defense in depth, not the source of truth.
// (Next 16 renamed the "middleware" convention to "proxy".)
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl
  const hasSession = req.cookies.has(SESSION_COOKIE)
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))

  // Unauthenticated user hitting a protected page → send to login with a return path.
  if (!hasSession && !isPublic) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  // Already-authenticated user hitting login/forgot → send to the dashboard.
  // (reset-password stays reachable so a valid link always works.)
  if (hasSession && (pathname === '/login' || pathname === '/forgot-password')) {
    const url = req.nextUrl.clone()
    url.pathname = '/'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

// Skip Next internals and static assets.
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
}
