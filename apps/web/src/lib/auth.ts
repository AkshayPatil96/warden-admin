// Client-side permission helpers for UI gating ONLY (hide/disable controls).
// The API still enforces every permission — never trust this for security.
// TODO: load current user/permissions from a /api/auth/me query.

export function hasPermission(_permissions: string[], _key: string): boolean {
  // TODO: return _permissions.includes(_key)
  return false
}
