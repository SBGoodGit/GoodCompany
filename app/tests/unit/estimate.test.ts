// Round 2 (D28): the itemised estimate drives every amount of the quote.
import { describe, expect, it } from 'vitest'
import { computeEstimate, estimateView, lineAmount, phaseView, shareBp, totalFromLines, type EstimateLineInput } from '../../shared/estimate'

const phases = [
  { sequence: 1, kind: 'advance' as const, description: 'Advance' },
  { sequence: 2, kind: 'work' as const, description: 'Carcasses' },
  { sequence: 3, kind: 'final' as const, description: 'Delivery' },
]
const sections = [
  { key: 'a', title: 'Preparation', kind: 'general' as const },
  { key: 'b', title: 'Cabinets', kind: 'general' as const },
  { key: 'm', title: 'Bought materials', kind: 'third_party' as const },
  { key: 'o', title: 'Own materials', kind: 'own_supply' as const },
]
const rules = { feePercentage: 2, holdbackPercentage: 10 }
const L = (over: Partial<EstimateLineInput>): EstimateLineInput => ({ section: 'b', description: 'x', kind: 'labour', quantity: 1, unit: 'piece', unit_price: 10_000, phase: 2, ...over })
/** §7.1 shape: advance 1,000, work 2,800, final 3,000, materials 3,000 → lines 9,800 + fee 200 = 10,000. */
const example = [
  L({ section: 'a', description: 'Mobilisation', unit: 'lump sum', unit_price: 100_000, phase: 1 }),
  L({ description: 'Carcasses', quantity: 40, unit: 'hour', unit_price: 7_000, phase: 2 }),
  L({ description: 'Delivery and finishing', quantity: 50, unit: 'hour', unit_price: 6_000, phase: 3 }),
  L({ section: 'm', description: 'Oak boards', kind: 'material', quantity: 12, unit: 'm²', unit_price: 25_000, phase: 2 }),
]

describe('itemised estimate (round 2)', () => {
  it('line amount = quantity × unit price, rounded to the cent', () => {
    expect(lineAmount(2.5, 4_999)).toBe(12_498) // 124.975 → 124.98
    expect(lineAmount(3, 1_000)).toBe(3_000)
  })
  it('phase amounts come from the lines; material lines form the materials budget; the fee is a separate line', () => {
    const e = computeEstimate({ sections, lines: example }, phases, rules)
    expect(e.errors).toEqual([])
    expect(e.phase_amounts.map((p) => p.amount)).toEqual([100_000, 280_000, 300_000])
    expect(e.materials_budget_amount).toBe(300_000)
    expect(e.lines_total).toBe(980_000)
    expect(e.fee_amount).toBe(20_000)
    expect(e.total_amount).toBe(1_000_000)
    expect(e.phase_amounts.map((p) => p.percentage)).toEqual([10, 28, 30])
    expect(e.materials_percentage).toBe(30)
    expect(e.fee_percentage).toBe(2)
    expect(e.section_totals.map((x) => [x.title, x.kind, x.amount])).toEqual([['Preparation', 'general', 100_000], ['Cabinets', 'general', 580_000], ['Bought materials', 'third_party', 300_000], ['Own materials', 'own_supply', 0]])
    expect(e.holdback_applies).toBe(true)
    expect(e.own_supply_amount).toBe(0)
  })
  it('lines + fee always equal the total exactly, and percentages always make 100%', () => {
    for (const linesTotal of [1, 99, 12_345, 980_001, 7_777_777]) {
      const { total, fee } = totalFromLines(linesTotal, 2)
      expect(total - fee).toBe(linesTotal)
      expect(Math.abs(fee - total * 0.02)).toBeLessThanOrEqual(1)
    }
    const e = computeEstimate({ sections, lines: [L({ phase: 1, unit_price: 33_333 }), L({ phase: 2, unit_price: 33_333 }), L({ phase: 3, unit_price: 33_334, quantity: 1 })] }, phases, rules)
    expect(e.lines_total + e.fee_amount).toBe(e.total_amount)
    expect(Math.round((e.fee_percentage + e.materials_percentage + e.phase_amounts.reduce((a, p) => a + p.percentage, 0)) * 100)).toBe(10_000)
    expect(shareBp([1, 1, 1]).reduce((a, b) => a + b, 0)).toBe(10_000)
  })
  it('uses the configured fee rate', () => {
    const e = computeEstimate({ sections, lines: example }, phases, { feePercentage: 3, holdbackPercentage: 10 })
    expect(e.total_amount - e.lines_total).toBe(e.fee_amount)
    expect(e.fee_percentage).toBe(3)
  })
  it('refuses a final phase below 10% of the contract value (D27)', () => {
    const lines = [L({ phase: 1, unit_price: 100_000 }), L({ phase: 2, unit_price: 800_000 }), L({ phase: 3, unit_price: 90_000 })]
    const e = computeEstimate({ sections, lines }, phases, rules)
    expect(e.errors.join(' ')).toMatch(/final phase must be at least 10% of the contract value/)
    const ok = computeEstimate({ sections, lines: [lines[0], lines[1], L({ phase: 3, unit_price: 110_000 })] }, phases, rules)
    expect(ok.errors).toEqual([])
  })
  it('every line needs a section, a phase and valid numbers; every phase needs an amount', () => {
    const e = computeEstimate({ sections, lines: [L({ phase: 9, section: 'zz', quantity: 0, unit: '', unit_price: -1, description: '' })] }, phases, rules)
    const all = e.errors.join(' | ')
    for (const m of [/description is required/, /quantity must be greater than 0/, /unit is required/, /unit price/, /choose a section/, /assign the line to a payment phase/, /Phase 1 .* has no amount/]) expect(all).toMatch(m)
    // Third-party materials alone give a phase no amount (they are paid from the materials budget)
    const onlyBought = computeEstimate({ sections, lines: [...example.slice(0, 2), L({ section: 'm', kind: 'material', phase: 3, unit_price: 500_000 })] }, phases, rules)
    expect(onlyBought.errors.join(' ')).toMatch(/Phase 3 .* has no amount: assign work lines or materials you supply yourself/)
  })
  it('detail level: section totals per phase by default, or all lines; completion requests see the same level', () => {
    const e = computeEstimate({ sections, lines: example }, phases, rules)
    const sec = estimateView(sections, e.lines, 'sections')
    expect(sec.lines).toEqual([])
    expect(sec.sections[1]).toMatchObject({ title: 'Cabinets', kind: 'general', amount: 580_000, phases: [{ phase: 2, amount: 280_000 }, { phase: 3, amount: 300_000 }] })
    expect(sec.sections[2]).toMatchObject({ title: 'Bought materials', kind: 'third_party' }) // the client sees the kind of section
    expect(phaseView(sec, 2)).toEqual([{ title: 'Cabinets', amount: 280_000 }, { title: 'Bought materials', amount: 300_000 }])
    const all = estimateView(sections, e.lines, 'lines')
    expect(all.lines).toHaveLength(4)
    expect(phaseView(all, 2).map((x) => x.title)).toEqual(['Carcasses', 'Oak boards'])
    // never purchase prices, suppliers or margin: the line has no such fields
    expect(Object.keys(all.lines[0]).sort()).toEqual(['amount', 'description', 'kind', 'note', 'phase', 'quantity', 'section', 'unit', 'unit_price'])
  })
})

describe('own-supply materials and material-only deliveries (round 2b, D29)', () => {
  it('own-supply materials count in the final phase, not in the materials budget', () => {
    const e = computeEstimate({ sections, lines: [...example, L({ section: 'o', kind: 'material', description: 'Hinges from own stock', quantity: 24, unit: 'piece', unit_price: 1_000, phase: 3 })] }, phases, rules)
    expect(e.errors).toEqual([])
    expect(e.own_supply_amount).toBe(24_000)
    expect(e.phase_amounts.map((p) => p.amount)).toEqual([100_000, 280_000, 324_000])
    expect(e.materials_budget_amount).toBe(300_000)
    expect(e.lines_total + e.fee_amount).toBe(e.total_amount)
  })
  it('own-supply materials are refused in an advance or any earlier phase', () => {
    for (const phase of [1, 2]) {
      const e = computeEstimate({ sections, lines: [...example, L({ section: 'o', kind: 'material', description: 'Own boards', phase })] }, phases, rules)
      expect(e.errors.join(' ')).toMatch(/materials you supply yourself are paid with the final payout; assign the line to the final phase/)
    }
  })
  it('material lines belong in a material section, and material sections hold only material lines', () => {
    const wrong = computeEstimate({ sections, lines: [...example.slice(0, 3), L({ section: 'b', kind: 'material', phase: 2 }), L({ section: 'm', kind: 'labour', phase: 3 })] }, phases, rules)
    expect(wrong.errors.join(' | ')).toMatch(/put material lines in a material section/)
    expect(wrong.errors.join(' | ')).toMatch(/a material section holds only material lines/)
  })
  it('a material-only delivery (material and transport lines) has no holdback, so the 10% final rule does not apply', () => {
    const single = [{ sequence: 1, kind: 'final' as const, description: 'Delivery' }]
    const lines = [
      L({ section: 'm', kind: 'material', description: 'Roof tiles', quantity: 400, unit: 'piece', unit_price: 2_500, phase: 1 }),
      L({ section: 'o', kind: 'material', description: 'Ridge tiles from own stock', quantity: 20, unit: 'piece', unit_price: 500, phase: 1 }),
      L({ section: 'a', kind: 'transport', description: 'Delivery to site', quantity: 1, unit: 'trip', unit_price: 5_000, phase: 1 }),
    ]
    const e = computeEstimate({ sections, lines }, single, rules)
    expect(e.errors).toEqual([])
    expect(e.holdback_applies).toBe(false)
    expect(e.holdback_percentage).toBe(0)
    expect(e.materials_budget_amount).toBe(1_000_000)
    expect(e.phase_amounts[0].amount).toBe(15_000) // transport + own-supply: under 2% of the total, allowed without a holdback
    expect(e.fee_amount).toBe(e.total_amount - 1_015_000) // the 2% fee applies
    // One labour line makes it work to review: the holdback and the 10% rule apply again
    const withWork = computeEstimate({ sections, lines: [...lines, L({ kind: 'labour', description: 'Fit', unit_price: 1_000, phase: 1 })] }, single, rules)
    expect(withWork.holdback_applies).toBe(true)
    expect(withWork.errors.join(' ')).toMatch(/final phase must be at least 10%/)
  })
})
