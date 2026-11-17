// Money helpers. Amounts are integers in minor units (cents). Percentages are handled in
// basis points (1% = 100 bp) so no floating-point sums decide a rule.

export const BP_TOTAL = 10_000

/** Convert a percentage with at most 2 decimals (e.g. 12.5) to basis points (1250). */
export function percentToBp(pct: number): number {
  const bp = Math.round(pct * 100)
  if (Math.abs(bp - pct * 100) > 1e-6) throw new Error(`Percentage ${pct} has more than 2 decimals`)
  return bp
}

/**
 * Largest-remainder split of `total` over `weightsBp` (which must sum to 10,000 bp).
 * The parts always sum exactly to `total`. Ties go to the earlier part (deterministic).
 */
export function largestRemainder(total: number, weightsBp: number[]): number[] {
  if (!Number.isInteger(total) || total < 0) throw new Error('total must be a non-negative integer')
  const sum = weightsBp.reduce((a, b) => a + b, 0)
  if (sum !== BP_TOTAL) throw new Error(`weights must sum to ${BP_TOTAL} bp, got ${sum}`)
  const exact = weightsBp.map((w) => (total * w) / BP_TOTAL)
  const parts = exact.map((x) => Math.floor(x))
  let remainder = total - parts.reduce((a, b) => a + b, 0)
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; remainder > 0; k++, remainder--) parts[order[k % order.length].i] += 1
  return parts
}

/** Parse a user-entered decimal amount ("1234.5", "1.234,50") into minor units. */
export function toMinor(input: string | number): number {
  if (typeof input === 'number') {
    if (!Number.isFinite(input)) throw new Error('Invalid amount')
    return Math.round(input * 100)
  }
  let s = input.trim().replace(/\s/g, '')
  if (/,\d{1,2}$/.test(s)) s = s.replace(/\./g, '').replace(',', '.')
  else s = s.replace(/,/g, '')
  if (!/^\d+(\.\d{1,2})?$/.test(s)) throw new Error(`Invalid amount: ${input}`)
  return Math.round(parseFloat(s) * 100)
}

export function formatMoney(minor: number | null | undefined, currency = 'EUR'): string {
  if (minor === null || minor === undefined) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(minor / 100)
}
