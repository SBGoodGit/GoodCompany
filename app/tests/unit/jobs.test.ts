import { describe, expect, it } from 'vitest'
import { canPostJobs, canRespondAsContractor, jobForViewer, nextManualStage } from '../../shared/jobs'
import { canonicalJson } from '../../shared/canonical'

describe('job budget visibility (§3.3)', () => {
  const job = { id: 'j', client_id: 'client', title: 'Roof', indicative_budget: 500_000 }
  it('returns the budget to the job owner', () => {
    expect(jobForViewer(job, 'client')).toHaveProperty('indicative_budget', 500_000)
  })
  it('never returns the budget to anyone else', () => {
    const seen = jobForViewer(job, 'contractor')
    expect(seen).not.toHaveProperty('indicative_budget')
    expect(JSON.stringify(seen)).not.toContain('500000')
  })
})

describe('workspace stages and roles', () => {
  it('advances manually only through introduction and technical intake', () => {
    expect(nextManualStage('introduction')).toBe('technical_intake')
    expect(nextManualStage('technical_intake')).toBe('terms')
    expect(nextManualStage('terms')).toBeNull()
    expect(nextManualStage('quote')).toBeNull()
  })
  it('limits marketplace roles', () => {
    expect(canPostJobs('client') && canPostJobs('both')).toBe(true)
    expect(canPostJobs('contractor') || canPostJobs('mediator') || canPostJobs('admin')).toBe(false)
    expect(canRespondAsContractor('contractor') && canRespondAsContractor('both')).toBe(true)
    expect(canRespondAsContractor('client') || canRespondAsContractor('mediator')).toBe(false)
  })
})

describe('canonical JSON for snapshot hashes', () => {
  it('is independent of key order', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { y: 1, x: 2 }], c: 3 } })).toBe(canonicalJson({ a: { c: 3, d: [2, { x: 2, y: 1 }] }, b: 1 }))
  })
})
