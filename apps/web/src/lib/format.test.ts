import { describe, expect, it } from 'vitest'
import { amountFromCents, centsFromAmount } from './format'

// Money round-trips between whole-unit form input and integer cents. These are
// locale-independent (unlike formatMoney's display string), so safe to assert.
describe('money conversion', () => {
  it('parses whole-unit amounts to integer cents', () => {
    expect(centsFromAmount('12.34')).toBe(1234)
    expect(centsFromAmount('10')).toBe(1000)
    expect(centsFromAmount('0')).toBe(0)
    expect(centsFromAmount(99.99)).toBe(9999)
  })

  it('formats cents back to a 2-decimal string', () => {
    expect(amountFromCents(1234)).toBe('12.34')
    expect(amountFromCents(1000)).toBe('10.00')
    expect(amountFromCents(0)).toBe('0.00')
  })

  it('round-trips', () => {
    for (const amount of ['0', '5', '12.34', '1000.50']) {
      expect(amountFromCents(centsFromAmount(amount))).toBe(Number(amount).toFixed(2))
    }
  })
})
