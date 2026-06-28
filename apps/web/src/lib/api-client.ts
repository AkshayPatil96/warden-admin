const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Single fetch surface. Always sends the session cookie; normalizes the API error envelope.
export async function apiClient<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })

  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const message = body?.error?.message ?? 'Request failed'
    throw new Error(message)
  }

  return res.json() as Promise<T>
}
