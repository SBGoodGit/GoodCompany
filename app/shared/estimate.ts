// Itemised estimate (round 2, D28; proposal §6, simplified). The contractor's estimate is the source
// of every amount in the quote: lines at selling price → phase amounts, materials budget, fee, total.
// Round 2b (D29): own-supply materials count in the final phase; an estimate without work,
// subcontracted work or equipment lines is a material-only delivery without holdback.
// Pure functions, shared by the server (authoritative) and the UI (live preview).
import { BP_TOTAL } from './money'
import { holdbackOf, type PhaseKind } from './terms'

export const LINE_KINDS = ['labour', 'material', 'equipment', 'subcontracted', 'transport', 'other'] as const
export type LineKind = (typeof LINE_KINDS)[number]
export type DetailLevel = 'sections' | 'lines'
/**
 * Section kinds (D29). Material lines go in one of the two material kinds:
 * - own_supply: materials supplied by the contractor (own stock, own production, bought and resold by
 *   the contractor, or from a connected company) → counted in the final phase, paid at the final payout;
 * - third_party: materials bought from third parties → the materials budget, paid to verified suppliers.
 */
export const SECTION_KINDS = ['general', 'own_supply', 'third_party'] as const
export type SectionKind = (typeof SECTION_KINDS)[number]
export const SECTION_KIND_LABEL: Record<SectionKind, string> = {
  general: 'Work and other costs',
  own_supply: 'Materials supplied by the contractor',
  third_party: 'Materials bought from third parties',
}
/** Lines that make a contract one with completed work to review, so the holdback applies (D29, D25). */
export const HOLDBACK_LINE_KINDS: LineKind[] = ['labour', 'subcontracted', 'equipment']

export interface EstimateSection { key: string; title: string; kind?: SectionKind }
export interface EstimateLineInput {
  section: string // EstimateSection.key
  description: string
  kind: LineKind
  quantity: number
  unit: string
  unit_price: number // minor units, selling price
  phase: number // payment phase sequence
  note?: string
}
export interface EstimateLine extends EstimateLineInput { amount: number }
export interface PhaseRef { sequence: number; kind: PhaseKind; description: string }

export interface EstimateResult {
  lines: EstimateLine[]
  lines_total: number // sum of all lines (= total − fee)
  fee_amount: number
  total_amount: number
  materials_budget_amount: number // sum of third-party material lines (D12, D29: selling price only)
  own_supply_amount: number // own-supply material lines, part of the final phase (D29)
  holdback_applies: boolean // false for a material-only delivery (D29)
  holdback_percentage: number
  phase_amounts: { sequence: number; kind: PhaseKind; amount: number; percentage: number }[]
  materials_percentage: number
  fee_percentage: number
  section_totals: { key: string; title: string; kind: SectionKind; amount: number }[]
  errors: string[]
}

/** Line amount: quantity × unit price, rounded to the cent. */
export const lineAmount = (quantity: number, unitPrice: number) => Math.round(quantity * unitPrice)

/**
 * Contract total from the sum of the lines: the 2% fee is a separate line on top, so that
 * lines + fee = total and fee ≈ 2% of the total (Build Spec §7.1). Rounded to the cent; the fee
 * takes the rounding difference, so the parts always add up exactly.
 */
export function totalFromLines(linesTotal: number, feePct: number) {
  const feeBp = Math.round(feePct * 100)
  const total = Math.round((linesTotal * BP_TOTAL) / (BP_TOTAL - feeBp))
  return { total, fee: total - linesTotal }
}

/** Basis points of `amounts` within their sum, by largest remainder, so they add up to exactly 100%. */
export function shareBp(amounts: number[]): number[] {
  const total = amounts.reduce((a, b) => a + b, 0)
  if (total <= 0) return amounts.map(() => 0)
  const exact = amounts.map((x) => (x * BP_TOTAL) / total)
  const parts = exact.map((x) => Math.floor(x))
  let rest = BP_TOTAL - parts.reduce((a, b) => a + b, 0)
  const order = exact.map((x, i) => ({ i, frac: x - Math.floor(x) })).sort((a, b) => b.frac - a.frac || a.i - b.i)
  for (let k = 0; rest > 0; k++, rest--) parts[order[k % order.length].i] += 1
  return parts
}

/**
 * Compute the estimate. Third-party material lines form the materials budget (they keep a phase for
 * information and for completion requests, but are not part of a phase amount, because the escrow pays
 * them from the materials budget). Own-supply material lines and all other lines make up the phase amounts.
 */
export function computeEstimate(
  input: { sections: EstimateSection[]; lines: EstimateLineInput[] },
  phases: PhaseRef[],
  rules: { feePercentage: number; holdbackPercentage: number },
): EstimateResult {
  const errors: string[] = []
  const sectionKeys = new Set(input.sections.map((s) => s.key))
  const phaseSeqs = new Set(phases.map((p) => p.sequence))
  if (!input.sections.length) errors.push('Add at least one section')
  for (const s of input.sections) {
    if (!s.title?.trim()) errors.push('Every section needs a title')
    if (s.kind !== undefined && !SECTION_KINDS.includes(s.kind)) errors.push(`Section "${s.title}": unknown kind`)
  }
  const kindOf = (key: string): SectionKind => input.sections.find((s) => s.key === key)?.kind ?? 'general'
  const ordered = [...phases].sort((a, b) => a.sequence - b.sequence)
  const finalSeq = ordered.find((p) => p.kind === 'final')?.sequence
  if (!input.lines.length) errors.push('Add at least one line')

  const lines: EstimateLine[] = input.lines.map((l, i) => {
    const n = i + 1
    if (!l.description?.trim()) errors.push(`Line ${n}: description is required`)
    if (!LINE_KINDS.includes(l.kind)) errors.push(`Line ${n}: kind must be one of ${LINE_KINDS.join(', ')}`)
    if (!(Number(l.quantity) > 0) || Math.abs(Math.round(Number(l.quantity) * 1000) - Number(l.quantity) * 1000) > 1e-6) errors.push(`Line ${n}: quantity must be greater than 0, with at most 3 decimals`)
    if (!l.unit?.trim()) errors.push(`Line ${n}: unit is required`)
    if (!Number.isInteger(l.unit_price) || l.unit_price < 0) errors.push(`Line ${n}: unit price must be a whole amount in cents, not negative`)
    if (!sectionKeys.has(l.section)) errors.push(`Line ${n}: choose a section`)
    if (!phaseSeqs.has(l.phase)) errors.push(`Line ${n}: assign the line to a payment phase`)
    const sk = kindOf(l.section)
    if (sectionKeys.has(l.section)) {
      if (l.kind === 'material' && sk === 'general') errors.push(`Line ${n}: put material lines in a material section (supplied by you, or bought from third parties)`)
      if (l.kind !== 'material' && sk !== 'general') errors.push(`Line ${n}: a material section holds only material lines`)
      if (l.kind === 'material' && sk === 'own_supply' && l.phase !== finalSeq) errors.push(`Line ${n}: materials you supply yourself are paid with the final payout; assign the line to the final phase`)
    }
    const quantity = Number(l.quantity)
    return { ...l, quantity, note: l.note ?? '', amount: Number.isFinite(quantity) && Number.isInteger(l.unit_price) ? lineAmount(quantity, l.unit_price) : 0 }
  })

  const linesTotal = lines.reduce((a, l) => a + l.amount, 0)
  const { total, fee } = totalFromLines(linesTotal, rules.feePercentage)
  const isThirdParty = (l: EstimateLine) => l.kind === 'material' && kindOf(l.section) === 'third_party'
  const isOwnSupply = (l: EstimateLine) => l.kind === 'material' && kindOf(l.section) === 'own_supply'
  const materials = lines.filter(isThirdParty).reduce((a, l) => a + l.amount, 0)
  const ownSupply = lines.filter(isOwnSupply).reduce((a, l) => a + l.amount, 0)
  // Phase amount: work and other lines of the phase, plus own-supply materials (always the final phase).
  // Third-party material lines keep a phase for information only; they are paid from the materials budget.
  const amounts = ordered.map((p) => lines.filter((l) => l.phase === p.sequence && !isThirdParty(l)).reduce((a, l) => a + l.amount, 0))
  const bp = shareBp([fee, materials, ...amounts])
  const holdbackApplies = lines.some((l) => HOLDBACK_LINE_KINDS.includes(l.kind))

  if (input.lines.length && total <= 0) errors.push('The estimate total must be greater than 0')
  ordered.forEach((p, i) => {
    if (input.lines.length && amounts[i] <= 0) errors.push(`Phase ${p.sequence} (${p.description || p.kind}) has no amount: assign work lines or materials you supply yourself to it`)
  })
  // The final phase covers the holdback only when a holdback applies (D29): not for a material-only delivery.
  const finalIdx = ordered.findIndex((p) => p.kind === 'final')
  const minFinal = holdbackOf(total, rules.holdbackPercentage)
  if (holdbackApplies && finalIdx >= 0 && total > 0 && amounts[finalIdx] < minFinal) {
    errors.push(`The final phase must be at least ${rules.holdbackPercentage}% of the contract value (${(minFinal / 100).toFixed(2)}), so the holdback can be withheld in full; it is now ${(amounts[finalIdx] / 100).toFixed(2)}`)
  }

  return {
    lines,
    lines_total: linesTotal,
    fee_amount: fee,
    total_amount: total,
    materials_budget_amount: materials,
    own_supply_amount: ownSupply,
    holdback_applies: holdbackApplies,
    holdback_percentage: holdbackApplies ? rules.holdbackPercentage : 0,
    phase_amounts: ordered.map((p, i) => ({ sequence: p.sequence, kind: p.kind, amount: amounts[i], percentage: bp[i + 2] / 100 })),
    materials_percentage: bp[1] / 100,
    fee_percentage: bp[0] / 100,
    section_totals: input.sections.map((s) => ({ key: s.key, title: s.title, kind: s.kind ?? 'general', amount: lines.filter((l) => l.section === s.key).reduce((a, l) => a + l.amount, 0) })),
    errors: [...new Set(errors)],
  }
}

/** What the client sees (and what goes into the contract snapshot), at the contractor's detail level. */
export function estimateView(sections: EstimateSection[], lines: EstimateLine[], detail: DetailLevel) {
  if (detail === 'lines') {
    return { detail_level: 'lines' as const, sections: sections.map((s) => ({ key: s.key, title: s.title, kind: s.kind ?? 'general' })), lines: lines.map((l) => ({ ...l })) }
  }
  // Section totals, per phase, so completion requests can show what a phase covers.
  return {
    detail_level: 'sections' as const,
    sections: sections.map((s) => {
      const own = lines.filter((l) => l.section === s.key)
      const byPhase = new Map<number, number>()
      for (const l of own) byPhase.set(l.phase, (byPhase.get(l.phase) ?? 0) + l.amount)
      return {
        key: s.key, title: s.title, kind: s.kind ?? 'general', amount: own.reduce((a, l) => a + l.amount, 0),
        phases: [...byPhase.entries()].sort((a, b) => a[0] - b[0]).map(([phase, amount]) => ({ phase, amount })),
      }
    }),
    lines: [] as EstimateLine[],
  }
}

export type EstimateView = ReturnType<typeof estimateView>

/** The part of an estimate view that belongs to one payment phase (for completion requests). */
export function phaseView(view: EstimateView, phase: number) {
  if (view.detail_level === 'lines') return view.lines.filter((l) => l.phase === phase).map((l) => ({ title: l.description, kind: l.kind, quantity: l.quantity, unit: l.unit, unit_price: l.unit_price, amount: l.amount }))
  return (view.sections as any[]).flatMap((s) => (s.phases ?? []).filter((x: any) => x.phase === phase).map((x: any) => ({ title: s.title, amount: x.amount })))
}
