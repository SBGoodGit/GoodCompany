import { describe, expect, it } from 'vitest'
import { mandatoryClauses, quoteBreakdown, validateTerms, type TermsInput } from '../../shared/terms'

const base = (over: Partial<TermsInput> = {}): TermsInput => ({
  warranty_period_days: 30,
  execution_period_days: 60,
  materials_budget_percentage: 30,
  payment_phases: [
    { sequence: 1, kind: 'advance', percentage: 10, description: 'Advance', evidence_required: '' },
    { sequence: 2, kind: 'work', percentage: 28, description: 'Rough work', evidence_required: 'Photos' },
    { sequence: 3, kind: 'final', percentage: 30, description: 'Delivery', evidence_required: 'Photos + sign-off' },
  ],
  ...over,
})

describe('validateTerms (§3.4)', () => {
  it('accepts phases + materials + 2% fee = 100%', () => {
    expect(validateTerms(base())).toEqual([])
  })
  it('rejects a sum other than 100%', () => {
    const errors = validateTerms(base({ materials_budget_percentage: 25 }))
    expect(errors.join(' ')).toMatch(/must together make 100%/)
  })
  it('allows only warranty periods 0, 15, 30, 90 (0 allowed, O26)', () => {
    expect(validateTerms(base({ warranty_period_days: 0 }))).toEqual([])
    expect(validateTerms(base({ warranty_period_days: 60 })).join(' ')).toMatch(/Warranty period/)
  })
  it('fixes the holdback at 10%', () => {
    expect(validateTerms(base({ holdback_percentage: 15 })).join(' ')).toMatch(/fixed at 10%/)
    expect(validateTerms(base({ holdback_percentage: 10 }))).toEqual([])
  })
  it('requires exactly one final phase, last in sequence', () => {
    const noFinal = base({ payment_phases: base().payment_phases.map((p) => ({ ...p, kind: p.kind === 'final' ? 'work' : p.kind })) })
    expect(validateTerms(noFinal).join(' ')).toMatch(/Exactly one phase/)
    const finalFirst = base({
      payment_phases: [
        { sequence: 1, kind: 'final', percentage: 30, description: 'Delivery', evidence_required: 'x' },
        { sequence: 2, kind: 'work', percentage: 38, description: 'Work', evidence_required: 'x' },
      ],
    })
    expect(validateTerms(finalFirst).join(' ')).toMatch(/must be last/)
  })
  it('requires evidence for work and final phases, not for an advance', () => {
    const p = base().payment_phases
    expect(validateTerms(base({ payment_phases: [p[0], { ...p[1], evidence_required: '' }, p[2]] })).join(' ')).toMatch(/evidence/)
  })
  it('requires a positive execution period', () => {
    expect(validateTerms(base({ execution_period_days: 0 })).join(' ')).toMatch(/Execution period/)
  })
  it('uses the configured fee rate', () => {
    expect(validateTerms(base(), { feePercentage: 3, warrantyOptions: [0, 15, 30, 90], holdbackPercentage: 10 }).length).toBeGreaterThan(0)
  })
})

describe('quoteBreakdown (§7.1)', () => {
  it('reproduces the spec example: 10,000.00 → fee 200.00, materials 3,000.00, phases 6,800.00', () => {
    const b = quoteBreakdown(1_000_000, base(), 2)
    expect(b.fee_amount).toBe(20_000)
    expect(b.materials_budget_amount).toBe(300_000)
    expect(b.phase_amounts.reduce((a, p) => a + p.amount, 0)).toBe(680_000)
    expect(b.phase_amounts.map((p) => p.amount)).toEqual([100_000, 280_000, 300_000])
  })
  it('always sums to the total with awkward amounts', () => {
    const t = base({
      materials_budget_percentage: 33.33,
      payment_phases: [
        { sequence: 1, kind: 'work', percentage: 32.33, description: 'a', evidence_required: 'x' },
        { sequence: 2, kind: 'final', percentage: 32.34, description: 'b', evidence_required: 'x' },
      ],
    })
    expect(validateTerms(t)).toEqual([])
    for (const total of [1, 7, 10_001, 123_457]) {
      const b = quoteBreakdown(total, t, 2)
      expect(b.fee_amount + b.materials_budget_amount + b.phase_amounts.reduce((a, p) => a + p.amount, 0)).toBe(total)
    }
  })
  it('works without a materials budget', () => {
    const b = quoteBreakdown(50_000, { payment_phases: [{ sequence: 1, kind: 'final', percentage: 98, description: 'x', evidence_required: 'x' }], materials_budget_percentage: null }, 2)
    expect(b).toMatchObject({ fee_amount: 1_000, materials_budget_amount: 0 })
    expect(b.phase_amounts[0].amount).toBe(49_000)
  })
})

describe('mandatory clauses', () => {
  it('pre-loads five clauses and mentions the 0-day holdback rule', () => {
    expect(mandatoryClauses(30)).toHaveLength(5)
    expect(mandatoryClauses(0)[0].text).toMatch(/both parties have agreed the final payment/)
  })
})
