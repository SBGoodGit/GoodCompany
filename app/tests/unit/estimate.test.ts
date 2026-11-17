// Round 2 (D28): the itemised estimate drives every amount of the quote.
import { describe, expect, it } from 'vitest'
import { computeEstimate, estimateView, lineAmount, phaseView, shareBp, totalFromLines, type EstimateLineInput } from '../../shared/estimate'

const phases = [
  { sequence: 1, kind: 'advance' as const, description: 'Advance' },
  { sequence: 2, kind: 'work' as const, description: 'Carcasses' },
  { sequence: 3, kind: 'final' as const, description: 'Delivery' },
]
const sections = [{ key: 'a', title: 'Preparation' }, { key: 'b', title: 'Cabinets' }]
const rules = { feePercentage: 2, holdbackPercentage: 10 }
const L = (over: Partial<EstimateLineInput>): EstimateLineInput => ({ section: 'b', description: 'x', kind: 'labour', quantity: 1, unit: 'piece', unit_price: 10_000, phase: 2, ...over })
/** §7.1 shape: advance 1,000, work 2,800, final 3,000, materials 3,000 → lines 9,800 + fee 200 = 10,000. */
const example = [
  L({ section: 'a', description: 'Mobilisation', unit: 'lump sum', unit_price: 100_000, phase: 1 }),
  L({ description: 'Carcasses', quantity: 40, unit: 'hour', unit_price: 7_000, phase: 2 }),
  L({ description: 'Delivery and finishing', quantity: 50, unit: 'hour', unit_price: 6_000, phase: 3 }),
  L({ description: 'Oak boards', kind: 'material', quantity: 12, unit: 'm²', unit_price: 25_000, phase: 2 }),
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
    expect(e.section_totals).toEqual([{ key: 'a', title: 'Preparation', amount: 100_000 }, { key: 'b', title: 'Cabinets', amount: 880_000 }])
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
  it('every line needs a section, a phase and valid numbers; every phase needs work', () => {
    const e = computeEstimate({ sections, lines: [L({ phase: 9, section: 'zz', quantity: 0, unit: '', unit_price: -1, description: '' })] }, phases, rules)
    const all = e.errors.join(' | ')
    for (const m of [/description is required/, /quantity must be greater than 0/, /unit is required/, /unit price/, /choose a section/, /assign the line to a payment phase/, /Phase 1 .* has no work/]) expect(all).toMatch(m)
    const onlyMaterial = computeEstimate({ sections, lines: [...example.slice(0, 2), L({ kind: 'material', phase: 3, unit_price: 500_000 })] }, phases, rules)
    expect(onlyMaterial.errors.join(' ')).toMatch(/Phase 3 .* has no work/)
  })
  it('detail level: section totals per phase by default, or all lines; completion requests see the same level', () => {
    const e = computeEstimate({ sections, lines: example }, phases, rules)
    const sec = estimateView(sections, e.lines, 'sections')
    expect(sec.lines).toEqual([])
    expect(sec.sections[1]).toMatchObject({ title: 'Cabinets', amount: 880_000, phases: [{ phase: 2, amount: 580_000 }, { phase: 3, amount: 300_000 }] })
    expect(phaseView(sec, 2)).toEqual([{ title: 'Cabinets', amount: 580_000 }])
    const all = estimateView(sections, e.lines, 'lines')
    expect(all.lines).toHaveLength(4)
    expect(phaseView(all, 2).map((x) => x.title)).toEqual(['Carcasses', 'Oak boards'])
    // never purchase prices, suppliers or margin: the line has no such fields
    expect(Object.keys(all.lines[0]).sort()).toEqual(['amount', 'description', 'kind', 'note', 'phase', 'quantity', 'section', 'unit', 'unit_price'])
  })
})
