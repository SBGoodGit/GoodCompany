// Community Bank rules (§3.6, §7.1, §7.4, §7.5). Amounts in minor units.
import { largestRemainder, percentToBp } from './money'

/** 4% base, +0.25% per 6-month block beyond 12 months, capped at +3% (v2 §6.3). */
export function interestRate(termMonths: number, cfg = { base: 4, step: 0.25, step_months: 6, after_months: 12, cap: 3 }): number {
  const extraBlocks = Math.max(0, Math.ceil((termMonths - cfg.after_months) / cfg.step_months))
  return Math.round((cfg.base + Math.min(cfg.cap, extraBlocks * cfg.step)) * 100) / 100
}

/** Required votes by amount (v2 §6.2): ≤ €2,000 → tier 1, ≤ €10,000 → tier 2, ≤ €50,000 → tier 3, above → tier 4 (cap). */
export function requiredVotes(amount: number, tiers: number[] = [50, 100, 250, 500]): number {
  if (amount <= 200_000) return tiers[0]
  if (amount <= 1_000_000) return tiers[1]
  if (amount <= 5_000_000) return tiers[2]
  return tiers[3]
}

/**
 * Split one fee batch: organisation reserve gets `orgFractionPct`% of the fee (1% → 0.02% of
 * contract value); the rest goes over the Community Bank reserves by the reserve split.
 */
export function splitFeeBatch(total: number, orgFractionPct: number, split: Record<string, number>) {
  const org = Math.round((total * orgFractionPct) / 100)
  const keys = Object.keys(split)
  const parts = largestRemainder(total - org, keys.map((k) => percentToBp(split[k])))
  return { organization: org, ...Object.fromEntries(keys.map((k, i) => [k, parts[i]])) } as Record<string, number>
}

const MONTH_MS = (365.25 / 12) * 86_400_000

/**
 * Interest accrues pro rata to time on the outstanding principal (simple interest). Early or partial
 * repayment therefore pays only the interest accrued so far: remaining interest falls pro rata.
 */
export function accruedInterest(outstanding: number, ratePct: number, from: Date, to: Date): number {
  const months = Math.max(0, (to.getTime() - from.getTime()) / MONTH_MS)
  return Math.round((outstanding * ratePct * months) / 1200)
}

/** Apply a repayment: accrued interest first, then principal. Overpayment beyond what is owed is refused by the caller. */
export function applyRepayment(amount: number, outstanding: number, accrued: number) {
  const interest = Math.min(amount, accrued)
  const principal = Math.min(outstanding, amount - interest)
  return { interest, principal, remainingPrincipal: outstanding - principal, unused: amount - interest - principal }
}

/** Safety reserve may not fall below `thresholdPct`% of its target share of all reserves; below it, no new loans. */
export function safetyOk(reserves: Record<string, number>, targetPct: number, thresholdPct: number): boolean {
  const total = ['safety', 'credit', 'legal', 'innovation'].reduce((a, k) => a + (reserves[k] ?? 0), 0)
  if (total === 0) return false
  return (reserves.safety ?? 0) >= (total * targetPct * thresholdPct) / 10_000
}

/** Community Health Score (illustrative; see BUILD_NOTES): 0–100 from reserve level, default rate and utilisation. */
export function healthScore(m: { reserve_level: number; default_rate: number; liquidity_utilization_ratio: number }): number {
  const level = Math.min(1, Math.max(0, m.reserve_level))
  return Math.round(100 * (0.4 * level + 0.3 * (1 - Math.min(1, m.default_rate)) + 0.3 * (1 - Math.min(1, m.liquidity_utilization_ratio))))
}
