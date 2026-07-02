// Client-side permission helpers for UI gating ONLY (hide/disable controls).
// The API still enforces every permission — never trust this for security.

export function hasPermission(permissions: string[], key: string): boolean {
  return permissions.includes(key)
}

export function hasAnyPermission(permissions: string[], keys: string[]): boolean {
  return keys.some((key) => permissions.includes(key))
}
