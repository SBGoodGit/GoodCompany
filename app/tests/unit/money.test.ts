import { describe, expect, it } from 'vitest'
import { formatMoney, largestRemainder, percentToBp, toMinor } from '../../shared/money'

describe('largestRemainder', () => {
  it('always sums exactly to the total', () => {
    for (const total of [1, 99, 100, 101, 999_999, 1_000_000, 1_234_567]) {
      const parts = largestRemainder(total, [3333, 3333, 3334])
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total)
    }
  })
  it('gives the remainder to the largest fractions, ties to the earlier part', () => {
    expect(largestRemainder(100, [3333, 3333, 3334])).toEqual([33, 33, 34])
    expect(largestRemainder(1, [5000, 5000])).toEqual([1, 0])
  })
  it('rejects weights that do not sum to 100%', () => {
    expect(() => largestRemainder(100, [5000, 4000])).toThrow()
  })
})

describe('amount parsing', () => {
  it('parses decimal input into minor units', () => {
    expect(toMinor('10000')).toBe(1_000_000)
    expect(toMinor('1,234.50')).toBe(123_450)
    expect(toMinor('1.234,50')).toBe(123_450)
    expect(toMinor('12.5')).toBe(1250)
    expect(() => toMinor('abc')).toThrow()
    expect(() => toMinor('1.234')).toThrow()
  })
  it('converts percentages to basis points and rejects more than 2 decimals', () => {
    expect(percentToBp(2)).toBe(200)
    expect(percentToBp(12.25)).toBe(1225)
    expect(() => percentToBp(1.005)).toThrow()
  })
  it('formats money', () => {
    expect(formatMoney(1_000_000)).toBe('€10,000.00')
  })
})
