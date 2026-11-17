// Reputation (§3.1.1), warranty metrics (§3.1) and review rules (§3.1, §5.6).

export interface ReviewRules {
  motivationThreshold: number // motivation required at or below this rating (3)
  motivationMinLength: number // indicative 100 characters
}

export function validateReview(rating: number, motivation: string | null | undefined, rules: ReviewRules): string[] {
  const errors: string[] = []
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) errors.push('Rating must be a whole number from 1 to 5')
  const text = (motivation ?? '').trim()
  if (rating <= rules.motivationThreshold && text.length < rules.motivationMinLength) {
    errors.push(`A motivation of at least ${rules.motivationMinLength} characters is required for a rating of ${rules.motivationThreshold} or lower`)
  }
  return errors
}

/**
 * Contractor score = weighted_avg(rating) × reliability_factor (v2 §2.1.1, §3.1.1).
 * Weights: the contract value of each reviewed contract. reliability_factor = on-time delivery
 * rate over the last `window` completed contracts, never below `floor`.
 * Returns null when there are no reviews.
 */
export function contractorScore(
  reviews: { rating: number; weight: number }[],
  onTime: boolean[], // most recent first
  opts: { floor: number; window: number },
): number | null {
  if (!reviews.length) return null
  const totalWeight = reviews.reduce((a, r) => a + Math.max(r.weight, 1), 0)
  const avg = reviews.reduce((a, r) => a + r.rating * Math.max(r.weight, 1), 0) / totalWeight
  return Math.round(avg * reliabilityFactor(onTime, opts) * 100) / 100
}

export function reliabilityFactor(onTime: boolean[], opts: { floor: number; window: number }): number {
  const recent = onTime.slice(0, opts.window)
  if (!recent.length) return 1
  const rate = recent.filter(Boolean).length / recent.length
  return Math.max(opts.floor, rate)
}

/** Rookie Stage: the score is public only after `required` completed contracts in that role. */
export const reputationPublic = (completed: number, required: number) => completed >= required

export interface WarrantyHistory {
  warranty_period_days: number
  warranty_finished: boolean // all tranches claimed or reassigned, contract closed
  had_claim: boolean // a warranty objection was raised
}

/** The three warranty profile metrics (Addendum §7). */
export function warrantyMetrics(completed: WarrantyHistory[]) {
  if (!completed.length) return { warranty_offered_rate: null, warranty_avg_days: null, warranty_completion_rate: null }
  const offered = completed.filter((c) => c.warranty_period_days > 0)
  const finished = offered.filter((c) => c.warranty_finished)
  return {
    warranty_offered_rate: Math.round((offered.length / completed.length) * 100) / 100,
    warranty_avg_days: Math.round(completed.reduce((a, c) => a + c.warranty_period_days, 0) / completed.length),
    warranty_completion_rate: finished.length ? Math.round((finished.filter((c) => !c.had_claim).length / finished.length) * 100) / 100 : null,
  }
}
