const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Thrown for any non-2xx response. Carries the HTTP status so callers can
// branch (e.g. treat 401 as "not logged in") and the API's human message.
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// Single fetch surface. Always sends the session cookie; normalizes the API error envelope.
export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new ApiError(res.status, body?.error?.message ?? 'Request failed.', body?.error?.code)
  }

  // 204 No Content (logout, forgot/reset password) has no body to parse.
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
