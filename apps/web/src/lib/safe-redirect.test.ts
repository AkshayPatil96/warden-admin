import { describe, expect, it } from 'vitest'
import { safeInternalPath } from './safe-redirect'

describe('safeInternalPath', () => {
  it('allows internal paths', () => {
    expect(safeInternalPath('/')).toBe('/')
    expect(safeInternalPath('/customers')).toBe('/customers')
    expect(safeInternalPath('/users?tab=1')).toBe('/users?tab=1')
  })

  it('rejects open-redirect vectors', () => {
    for (const bad of ['//evil.com', '/\\evil.com', '/\\/evil.com', 'https://evil.com', 'javascript:alert(1)']) {
      expect(safeInternalPath(bad)).toBe('/')
    }
  })

  it('falls back for empty/nullish input', () => {
    expect(safeInternalPath(null)).toBe('/')
    expect(safeInternalPath(undefined)).toBe('/')
    expect(safeInternalPath('')).toBe('/')
    expect(safeInternalPath('//evil.com', '/login')).toBe('/login')
  })
})
