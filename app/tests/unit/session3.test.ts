// Business rules of session 3: reviews and reputation (§3.1), Community Bank (§7.1, §7.4, §7.5).
import { describe, expect, it } from 'vitest'
import { contractorScore, reliabilityFactor, reputationPublic, validateReview, warrantyMetrics } from '../../shared/reputation'
import { accruedInterest, applyRepayment, healthScore, interestRate, requiredVotes, safetyOk, splitFeeBatch } from '../../shared/bank'

const rules = { motivationThreshold: 3, motivationMinLength: 100 }

describe('reviews (§3.1)', () => {
  it('requires a motivation of the minimum length for a rating of 3 or lower', () => {
    expect(validateReview(5, '', rules)).toEqual([])
    expect(validateReview(4, null, rules)).toEqual([])
    expect(validateReview(3, 'too short', rules)[0]).toMatch(/at least 100 characters/)
    expect(validateReview(1, 'x'.repeat(100), rules)).toEqual([])
  })
  it('rating is a whole number from 1 to 5', () => {
    expect(validateReview(0, 'x'.repeat(100), rules).length).toBe(1)
    expect(validateReview(6, '', rules).length).toBe(1)
    expect(validateReview(4.5, '', rules).length).toBe(1)
  })
})

describe('contractor reputation (§3.1.1)', () => {
  const opts = { floor: 0.5, window: 20 }
  it('weighted average × reliability factor', () => {
    expect(contractorScore([{ rating: 5, weight: 1 }, { rating: 3, weight: 3 }], [true, true], opts)).toBe(3.5)
    expect(contractorScore([{ rating: 4, weight: 1 }], [true, false], opts)).toBe(2) // 4 × 0.5
  })
  it('reliability never falls below the floor and uses the last N contracts only', () => {
    expect(reliabilityFactor([false, false, false], opts)).toBe(0.5)
    expect(reliabilityFactor([true, false, false, false], opts)).toBe(0.5)
    expect(reliabilityFactor([...Array(20).fill(true), false, false], opts)).toBe(1)
    expect(reliabilityFactor([], opts)).toBe(1)
  })
  it('no reviews → no score', () => {
    expect(contractorScore([], [true], opts)).toBeNull()
  })
  it('Rookie Stage: public only after the required number of completed contracts', () => {
    expect(reputationPublic(9, 10)).toBe(false)
    expect(reputationPublic(10, 10)).toBe(true)
  })
})

describe('warranty metrics (§3.1)', () => {
  it('offered rate, average days, completion rate excluding 0-day warranties', () => {
    const m = warrantyMetrics([
      { warranty_period_days: 0, warranty_finished: true, had_claim: false },
      { warranty_period_days: 30, warranty_finished: true, had_claim: false },
      { warranty_period_days: 90, warranty_finished: true, had_claim: true },
      { warranty_period_days: 30, warranty_finished: false, had_claim: false },
    ])
    expect(m).toEqual({ warranty_offered_rate: 0.75, warranty_avg_days: 38, warranty_completion_rate: 0.5 })
    expect(warrantyMetrics([]).warranty_offered_rate).toBeNull()
  })
})

describe('Community Bank', () => {
  it('interest: 4% base, +0.25% per 6 months beyond 12, cap +3% (§7.5)', () => {
    expect(interestRate(6)).toBe(4)
    expect(interestRate(12)).toBe(4)
    expect(interestRate(13)).toBe(4.25)
    expect(interestRate(18)).toBe(4.25)
    expect(interestRate(24)).toBe(4.5)
    expect(interestRate(120)).toBe(7)
  })
  it('required votes by amount tier, capped at the last tier (§7.4)', () => {
    expect(requiredVotes(150_000)).toBe(50)
    expect(requiredVotes(200_000)).toBe(50)
    expect(requiredVotes(200_001)).toBe(100)
    expect(requiredVotes(5_000_000)).toBe(250)
    expect(requiredVotes(99_000_000)).toBe(500)
    expect(requiredVotes(150_000, [1, 2, 3, 4])).toBe(1)
  })
  it('fee batch: 1% of the fee to the organisation reserve, the rest 60/20/10/10, exact to the cent (§7.1)', () => {
    const split = splitFeeBatch(100_000, 1, { safety: 60, credit: 20, legal: 10, innovation: 10 })
    expect(split).toEqual({ organization: 1_000, safety: 59_400, credit: 19_800, legal: 9_900, innovation: 9_900 })
    const odd = splitFeeBatch(20_001, 1, { safety: 60, credit: 20, legal: 10, innovation: 10 })
    expect(Object.values(odd).reduce((a, b) => a + b, 0)).toBe(20_001)
  })
  it('interest accrues pro rata to time; early repayment pays only what accrued (§3.6)', () => {
    const start = new Date('2026-01-01T00:00:00Z')
    const yearLater = new Date('2027-01-01T06:00:00Z')
    expect(accruedInterest(1_000_000, 4, start, yearLater)).toBe(40_000)
    expect(accruedInterest(1_000_000, 4, start, start)).toBe(0)
    const r = applyRepayment(50_000, 1_000_000, 20_000)
    expect(r).toEqual({ interest: 20_000, principal: 30_000, remainingPrincipal: 970_000, unused: 0 })
  })
  it('Safety Reserve threshold: below 55% of its 60% target share → no new loans', () => {
    expect(safetyOk({ safety: 600, credit: 200, legal: 100, innovation: 100 }, 60, 55)).toBe(true)
    expect(safetyOk({ safety: 330, credit: 470, legal: 100, innovation: 100 }, 60, 55)).toBe(true)
    expect(safetyOk({ safety: 329, credit: 471, legal: 100, innovation: 100 }, 60, 55)).toBe(false)
    expect(safetyOk({}, 60, 55)).toBe(false)
  })
  it('health score stays within 0–100', () => {
    expect(healthScore({ reserve_level: 1, default_rate: 0, liquidity_utilization_ratio: 0 })).toBe(100)
    expect(healthScore({ reserve_level: 0, default_rate: 1, liquidity_utilization_ratio: 1 })).toBe(0)
  })
})
