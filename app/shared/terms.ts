// Terms of engagement and quote rules (Build Spec v3 §3.4, §7.1–§7.3)
import { largestRemainder, percentToBp } from './money'

export type PhaseKind = 'advance' | 'work' | 'final'

export interface PaymentPhase {
  sequence: number
  kind: PhaseKind
  /** Round 2: computed from the itemised estimate, not entered in the terms. Only quoteBreakdown uses it. */
  percentage?: number
  description: string
  evidence_required: string
}

export interface TermsInput {
  working_hours?: string
  communication_channel?: string
  ownership_terms?: string
  cancellation_terms?: string
  warranty_period_days: number
  holdback_percentage?: number
  payment_phases: PaymentPhase[]
  materials_budget_percentage?: number | null // round 2: derived from the estimate's material lines
  execution_period_days: number
}

export interface TermsRules {
  feePercentage: number // platform_fee_rate, e.g. 2
  warrantyOptions: number[] // [0, 15, 30, 90]
  holdbackPercentage: number // fixed 10
}

export const DEFAULT_TERMS_RULES: TermsRules = { feePercentage: 2, warrantyOptions: [0, 15, 30, 90], holdbackPercentage: 10 }

/** The holdback on a contract value, in cents. Rounded down, so a final phase of at least the holdback
 *  percentage (whose amount the largest-remainder split never rounds below the floor) always covers it. */
export const holdbackOf = (value: number, pct: number) => Math.floor((value * pct) / 100)

/**
 * Validate a terms version (round 2, D28): the contractor proposes the phase *structure* (kind,
 * description, evidence). Amounts and percentages come from the itemised estimate, which also checks
 * that the final phase is at least the holdback (shared/estimate.ts). Returns readable errors.
 */
export function validateTerms(t: TermsInput, rules: TermsRules = DEFAULT_TERMS_RULES): string[] {
  const errors: string[] = []
  if (!rules.warrantyOptions.includes(t.warranty_period_days)) {
    errors.push(`Warranty period must be one of ${rules.warrantyOptions.join(', ')} days`)
  }
  if (t.holdback_percentage !== undefined && t.holdback_percentage !== rules.holdbackPercentage) {
    errors.push(`The holdback is fixed at ${rules.holdbackPercentage}%`)
  }
  if (!Number.isInteger(t.execution_period_days) || t.execution_period_days <= 0) {
    errors.push('Execution period must be a whole number of days greater than 0')
  }
  const phases = [...(t.payment_phases ?? [])].sort((a, b) => a.sequence - b.sequence)
  if (phases.length === 0) errors.push('At least one payment phase is required')
  const finals = phases.filter((p) => p.kind === 'final')
  if (finals.length !== 1) errors.push('Exactly one phase must be of kind "final"')
  else if (phases[phases.length - 1].kind !== 'final') errors.push('The final phase must be last in sequence')
  phases.forEach((p, i) => {
    if (p.sequence !== i + 1) errors.push('Phase sequence numbers must run 1, 2, 3, … without gaps')
    if (!['advance', 'work', 'final'].includes(p.kind)) errors.push(`Phase ${p.sequence}: kind must be advance, work or final`)
    if (!p.description?.trim()) errors.push(`Phase ${p.sequence}: description is required`)
    if (p.kind !== 'advance' && !p.evidence_required?.trim()) {
      errors.push(`Phase ${p.sequence}: describe the evidence that makes a completion request formal`)
    }
  })
  return [...new Set(errors)]
}

export interface QuoteBreakdown {
  phase_amounts: { sequence: number; kind: PhaseKind; amount: number }[]
  materials_budget_amount: number
  fee_amount: number
}

/**
 * Split the quote total over phases, materials budget and fee with largest-remainder rounding.
 * The three together always equal the total (§7.1). Order of parts for tie-breaking: fee, materials, phases.
 */
export function quoteBreakdown(totalAmount: number, terms: Pick<TermsInput, 'payment_phases' | 'materials_budget_percentage'>, feePercentage: number): QuoteBreakdown {
  const phases = [...terms.payment_phases].sort((a, b) => a.sequence - b.sequence)
  const weights = [percentToBp(feePercentage), percentToBp(terms.materials_budget_percentage ?? 0), ...phases.map((p) => percentToBp(p.percentage ?? 0))]
  const parts = largestRemainder(totalAmount, weights)
  return {
    fee_amount: parts[0],
    materials_budget_amount: parts[1],
    phase_amounts: phases.map((p, i) => ({ sequence: p.sequence, kind: p.kind, amount: parts[i + 2] })),
  }
}

/** Mandatory clauses 1–5 (Warranty/Holdback Addendum §8, adapted to v3). Pre-loaded; cannot be removed. */
export function mandatoryClauses(warrantyDays: number, holdbackPct = 10) {
  return [
    {
      key: 'holdback_reservation',
      title: 'Holdback reservation',
      text:
        warrantyDays === 0
          ? `${holdbackPct}% of the contract value is held back. With a 0-day warranty it stays in escrow until both parties have agreed the final payment.`
          : `${holdbackPct}% of the contract value is held back during the ${warrantyDays}-day warranty period and becomes claimable by the contractor in tranches.`,
    },
    {
      key: 'no_insurance',
      title: 'No insurance cover',
      text: 'The holdback is a motivation amount, not insurance cover. Repair costs that exceed the holdback are borne by the contractor.',
    },
    {
      key: 'change_order_funding',
      title: 'Change Order funding',
      text: 'Extra work requires acceptance and full funding before it starts. There is no obligation to carry out work that has not been funded.',
    },
    {
      key: 'no_change_order_in_warranty',
      title: 'No Change Orders during warranty',
      text: 'Extra work cannot be added to a job whose warranty period has started; a new, linked contract is needed for it.',
    },
    {
      key: 'warranty_obligation',
      title: 'Warranty obligation',
      text: 'During the agreed warranty period the contractor must repair demonstrable defects that fall under the agreed job within a reasonable time. Disagreements about whether a defect is covered follow the GoodCompany completion and dispute procedure, in which an independent Mediator gives non-binding advice.',
    },
  ]
}
