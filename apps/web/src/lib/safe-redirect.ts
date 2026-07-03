// Returns `next` only when it's a safe internal path. Rejects protocol-relative
// ("//evil.com") and backslash ("/\\evil.com") forms that browsers resolve as
// absolute cross-origin URLs — otherwise a ?next= param is an open redirect.
export function safeInternalPath(next: string | null | undefined, fallback = '/'): string {
  return next && /^\/(?![/\\])/.test(next) ? next : fallback
}
