import { describe, expect, it } from 'vitest'
import { hasPermission, hasAnyPermission } from './auth'

const perms = ['billing:read', 'billing:write', 'audit:read']

describe('hasPermission', () => {
  it('is true only for a granted permission', () => {
    expect(hasPermission(perms, 'billing:write')).toBe(true)
    expect(hasPermission(perms, 'billing:delete')).toBe(false)
    expect(hasPermission([], 'billing:read')).toBe(false)
  })
})

describe('hasAnyPermission', () => {
  it('is true when at least one is granted', () => {
    expect(hasAnyPermission(perms, ['users:write', 'billing:read'])).toBe(true)
    expect(hasAnyPermission(perms, ['users:write', 'users:delete'])).toBe(false)
    expect(hasAnyPermission(perms, [])).toBe(false)
  })
})
