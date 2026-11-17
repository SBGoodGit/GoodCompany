// Community Bank (§3.6, §5.7, §7.1, §7.4, §7.5) with simulated balances. Reserves are the Community
// Bank's own ledger (reserves + ledger_transactions); user balances move only through SimulatedLedger.
import { randomInt } from 'node:crypto'
import { accruedInterest, applyRepayment, healthScore, interestRate, requiredVotes, safetyOk, splitFeeBatch } from '../../shared/bank'

export async function reserveBalances(tx: Tx): Promise<Record<string, number>> {
  const rows = await tx`select type, balance from reserves`
  return Object.fromEntries(rows.map((r: any) => [r.type, Number(r.balance)]))
}

async function addToReserve(tx: Tx, type: string, amount: number, source: string, ref: { loan?: string; batch?: string } = {}) {
  await tx`update reserves set balance = balance + ${amount} where type = ${type}`
  await tx`insert into ledger_transactions (source_type, amount, reserve_type, related_loan_id, fee_batch_id)
           values (${source}, ${amount}, ${type}, ${ref.loan ?? null}, ${ref.batch ?? null})`
}

/** Fee aggregation job: one batch when the minimum count is met; split over the reserves on arrival. */
export async function runFeeAggregation() {
  return db().begin(async (tx) => {
    const settings = await getSettings(tx)
    const batch = await ledgerFor(tx).feeBatchTransfer(Number(settings.fee_batch_min_count ?? 5))
    if (!batch) return { batch: null }
    const parts = splitFeeBatch(batch.total, Number(settings.organization_reserve_fraction ?? 1), settings.reserve_split)
    for (const [reserve, amount] of Object.entries(parts)) if (amount > 0) await addToReserve(tx, reserve, amount, 'platform_fee', { batch: batch.id })
    await audit(tx, { event_type: 'fee_batch', actor_id: null, payload: { batch_id: batch.id, fee_count: batch.count, total: batch.total } })
    return { batch: batch.id, total: batch.total, fee_count: batch.count }
  })
}

/** Eligible voters (§7.4): account age ≥ 30 days and ≥ 1 completed contract; never the applicant or supplier. */
export async function eligibleVoters(tx: Tx, exclude: string[]) {
  return tx`
    select u.id from users u join profiles p on p.user_id = u.id
     where u.status = 'active' and u.role in ('client','contractor','both') and u.created_at <= now() - interval '30 days'
       and (p.completed_as_contractor + p.completed_as_client) >= 1 and u.id <> all(${exclude})`
}

/** Random sample without replacement (crypto randomness: not deterministic or gameable). */
export function sample<T>(items: T[], n: number): T[] {
  const a = [...items]
  for (let i = a.length - 1; i > 0; i--) {
    const j = randomInt(i + 1)
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

/**
 * Submit a loan application (§13.2 OD5, D27): it waits for an administrative check before any vote.
 * The interest rate and the number of votes are derived now; voters are invited only after approval.
 */
export async function submitLoanApplication(tx: Tx, applicantId: string, b: { purpose_category: string; purpose: string; amount: number; term: number; projected_income: number | null; supplier_id: string }) {
  const settings = await getSettings(tx)
  const required = requiredVotes(b.amount, settings.required_votes_tiers)
  const audience = required * Number(settings.audience_multiplier ?? 3)
  const rate = interestRate(b.term, settings.loan_interest_rate)
  const [loan] = await tx`
    insert into loan_applications (applicant_id, purpose_category, purpose, amount_requested, repayment_term_months, interest_rate,
      projected_income, supplier_id, required_votes, audience_size, status)
    values (${applicantId}, ${b.purpose_category}, ${b.purpose}, ${b.amount}, ${b.term}, ${rate}, ${b.projected_income}, ${b.supplier_id},
      ${required}, ${audience}, 'admin_check')
    returning *`
  const admins = await tx`select id from users where role = 'admin' and status = 'active'`
  for (const a of admins) {
    await notify(tx, { user_id: a.id, type: 'loan_admin_check', title: 'A loan application waits for the administrative check', link: '/admin', dedupe_key: `loan-check:${loan.id}` })
  }
  await audit(tx, { event_type: 'loan_submitted', actor_id: applicantId, payload: { loan_id: loan.id } })
  return loan
}

/**
 * Administrative check (OD5, D27): completeness, required data and formal conditions only — never the
 * merits of the loan or how members should vote. Approve → the vote starts; return → no vote, with a reason.
 */
export async function adminCheckLoan(tx: Tx, adminId: string, id: string, decision: 'approve' | 'return', note: string) {
  const [loan] = await tx`select * from loan_applications where id = ${id} for update`
  if (!loan) bad('Loan not found', 404)
  if (loan.status !== 'admin_check') bad('This application is not waiting for the administrative check')
  const text = note.trim()
  if (decision === 'return' && !text) bad('State the reason for returning the application')
  if (decision === 'return') {
    await tx`update loan_applications set status = 'returned', resolved_at = now(), admin_checked_by = ${adminId}, admin_checked_at = now(), admin_check_note = ${text} where id = ${id}`
    await audit(tx, { event_type: 'loan_returned', actor_id: adminId, payload: { loan_id: id, reason: text } })
    await notify(tx, { user_id: loan.applicant_id, type: 'loan', title: 'Your loan application was returned after the administrative check', body: text, link: `/community-bank/loans/${id}` })
    return { status: 'returned' }
  }
  const settings = await getSettings(tx)
  const days = Number(settings.community_vote_duration_days ?? 14)
  await tx`update loan_applications set status = 'community_voting', voting_ends_at = now() + make_interval(days => ${days}),
             admin_checked_by = ${adminId}, admin_checked_at = now(), admin_check_note = ${text || null} where id = ${id}`
  const pool = await eligibleVoters(tx, [loan.applicant_id, loan.supplier_id])
  const invited = sample(pool.map((p: any) => p.id as string), loan.audience_size)
  for (const voter of invited) {
    await tx`insert into vote_invitations (loan_application_id, voter_id) values (${id}, ${voter})`
    await notify(tx, { user_id: voter, type: 'vote_invitation', title: 'You are invited to vote on a Community Bank loan', link: `/community-bank/loans/${id}` })
  }
  await audit(tx, { event_type: 'loan_admin_approved', actor_id: adminId, payload: { loan_id: id, invited: invited.length } })
  await notify(tx, { user_id: loan.applicant_id, type: 'loan', title: 'Your loan application passed the administrative check and goes to a vote', link: `/community-bank/loans/${id}` })
  return { status: 'community_voting', invited: invited.length }
}

/**
 * Vote resolution job (v2 §4.8): once required votes are in → approved if ≥ threshold for and the
 * reserves allow it (credit reserve covers the amount, safety reserve stays above its minimum), then
 * activated (SubEscrow from the Credit Reserve). After the window without enough votes → rejected.
 */
export async function runVoteResolution(now = new Date()) {
  const loans = await db()`select id from loan_applications where status = 'community_voting'`
  const out = { approved: 0, rejected: 0 }
  for (const { id } of loans) {
    const r = await db().begin(async (tx) => resolveLoan(tx, id, now))
    if (r === 'approved') out.approved++
    if (r === 'rejected') out.rejected++
  }
  return out
}

export async function resolveLoan(tx: Tx, id: string, now = new Date()) {
  const [loan] = await tx`select * from loan_applications where id = ${id} for update`
  if (!loan || loan.status !== 'community_voting') return null
  const settings = await getSettings(tx)
  const votes = await tx`select choice from votes where application_id = ${id}`
  const enough = votes.length >= loan.required_votes
  if (!enough) {
    if (new Date(loan.voting_ends_at) > now) return null
    return reject(tx, loan, 'Not enough votes within the voting window')
  }
  const share = (votes.filter((v: any) => v.choice === 'for').length / votes.length) * 100
  if (share < Number(settings.community_loan_approval_threshold ?? 60)) return reject(tx, loan, `${Math.round(share)}% voted for; ${settings.community_loan_approval_threshold}% is needed`)
  const reserves = await reserveBalances(tx)
  const after = { ...reserves, credit: reserves.credit - Number(loan.amount_requested) }
  if (after.credit < 0 || !safetyOk(after, Number(settings.reserve_split?.safety ?? 60), Number(settings.safety_reserve_threshold ?? 55))) {
    return reject(tx, loan, 'The reserves cannot carry this loan now (Credit Reserve or Safety Reserve threshold)')
  }
  await tx`update vote_invitations set status = 'closed' where loan_application_id = ${id} and status = 'pending'`
  // Activation: the loan money goes into a SubEscrow for the supplier, never to the applicant.
  await addToReserve(tx, 'credit', -Number(loan.amount_requested), 'loan_disbursement', { loan: id })
  await tx`insert into sub_escrows (loan_application_id, community_bank_reserve_type, supplier_id, amount) values (${id}, 'credit', ${loan.supplier_id}, ${loan.amount_requested})`
  await tx`update loan_applications set status = 'active', resolved_at = now(), activated_at = now(), last_interest_at = now(),
             principal_outstanding = amount_requested where id = ${id}`
  await audit(tx, { event_type: 'loan_approved', actor_id: null, payload: { loan_id: id, votes: votes.length, share: Math.round(share) } })
  await notify(tx, { user_id: loan.applicant_id, type: 'loan', title: 'Your loan was approved by the community', body: 'Release the sub-escrow to your supplier when you place the order.', link: `/community-bank/loans/${id}` })
  return 'approved'
}

async function reject(tx: Tx, loan: any, reason: string) {
  await tx`update loan_applications set status = 'rejected', resolved_at = now() where id = ${loan.id}`
  await tx`update vote_invitations set status = 'closed' where loan_application_id = ${loan.id} and status = 'pending'`
  await audit(tx, { event_type: 'loan_rejected', actor_id: null, payload: { loan_id: loan.id, reason } })
  await notify(tx, { user_id: loan.applicant_id, type: 'loan', title: 'Your loan application was not approved', body: reason, link: `/community-bank/loans/${loan.id}` })
  return 'rejected' as const
}

/** The applicant releases the SubEscrow to the supplier: supplier paid (simulated), invoices for both. */
export async function releaseSubEscrow(tx: Tx, loanId: string, applicantId: string) {
  const [loan] = await tx`select * from loan_applications where id = ${loanId} for update`
  if (!loan || loan.applicant_id !== applicantId) bad('Loan not found', 404)
  const [se] = await tx`select * from sub_escrows where loan_application_id = ${loanId} and status = 'pending' for update`
  if (!se) bad('There is no pending sub-escrow')
  await ledgerFor(tx).moveUserBalance(null, se.supplier_id, Number(se.amount), 'sub_escrow_release', { loan_id: loanId })
  await tx`update sub_escrows set status = 'released', released_at = now() where id = ${se.id}`
  const ref = await nextInvoiceReference(tx, 'CB')
  await tx`insert into invoices (user_id, related_sub_escrow_id, direction, kind, amount, currency, external_reference_id)
           values (${se.supplier_id}, ${se.id}, 'issued', 'invoice', ${se.amount}, 'EUR', ${ref}),
                  (${applicantId}, ${se.id}, 'received', 'invoice', ${se.amount}, 'EUR', ${ref + '-R'})`
  await audit(tx, { event_type: 'sub_escrow_released', actor_id: applicantId, payload: { loan_id: loanId } })
  await notify(tx, { user_id: se.supplier_id, type: 'loan', title: 'You received a Community Bank supplier payment (simulated)' })
}

/** Repayment (§5.7): accrued interest first, then principal; early and partial repayment without penalty. */
export async function repayLoan(tx: Tx, loanId: string, applicantId: string, amount: number, now = new Date()) {
  const [loan] = await tx`select * from loan_applications where id = ${loanId} for update`
  if (!loan || loan.applicant_id !== applicantId) bad('Loan not found', 404)
  if (loan.status !== 'active') bad('This loan is not active')
  const accrued = accruedInterest(Number(loan.principal_outstanding), Number(loan.interest_rate), new Date(loan.last_interest_at), now)
  const owed = Number(loan.principal_outstanding) + accrued
  if (amount > owed) bad(`At most ${owed} is owed now`)
  const r = applyRepayment(amount, Number(loan.principal_outstanding), accrued)
  await ledgerFor(tx).moveUserBalance(applicantId, null, amount, 'loan_repayment', { loan_id: loanId })
  if (r.principal > 0) await addToReserve(tx, 'credit', r.principal, 'loan_repayment', { loan: loanId })
  if (r.interest > 0) await addToReserve(tx, 'credit', r.interest, 'interest', { loan: loanId })
  const repaid = r.remainingPrincipal === 0
  await tx`update loan_applications set principal_outstanding = ${r.remainingPrincipal}, interest_paid = interest_paid + ${r.interest},
             amount_repaid = amount_repaid + ${amount}, last_interest_at = ${now}, status = ${repaid ? 'repaid' : 'active'} where id = ${loanId}`
  await audit(tx, { event_type: repaid ? 'loan_repaid' : 'loan_repayment', actor_id: applicantId, payload: { loan_id: loanId, amount } })
  return { ...r, repaid }
}

/** Community Health Score (daily job). */
export async function runHealthScore() {
  return db().begin(async (tx) => {
    const settings = await getSettings(tx)
    const reserves = await reserveBalances(tx)
    const [loans] = await tx`select coalesce(sum(principal_outstanding) filter (where status = 'active'), 0)::bigint as outstanding,
                                    count(*) filter (where status = 'defaulted')::int as defaulted,
                                    count(*) filter (where status in ('active','repaid','defaulted'))::int as granted from loan_applications`
    const [flow] = await tx`select coalesce(sum(amount) filter (where source_type in ('loan_repayment','interest','platform_fee')), 0)::bigint as inflow,
                                   coalesce(-sum(amount) filter (where source_type = 'loan_disbursement'), 0)::bigint as outflow
                              from ledger_transactions where timestamp > now() - interval '30 days'`
    const total = ['safety', 'credit', 'legal', 'innovation'].reduce((a, k) => a + (reserves[k] ?? 0), 0)
    const safetyTarget = (total * Number(settings.reserve_split?.safety ?? 60)) / 100
    const m = {
      liquidity_utilization_ratio: Number(loans.outstanding) / Math.max(1, Number(loans.outstanding) + (reserves.credit ?? 0)),
      default_rate: loans.granted ? loans.defaulted / loans.granted : 0,
      cash_flow: Number(flow.inflow) - Number(flow.outflow),
      reserve_level: safetyTarget ? (reserves.safety ?? 0) / safetyTarget : 0,
    }
    const score = healthScore(m)
    await tx`insert into community_health_score_snapshots (liquidity_utilization_ratio, default_rate, cash_flow, reserve_level, computed_score)
             values (${m.liquidity_utilization_ratio}, ${m.default_rate}, ${m.cash_flow}, ${m.reserve_level}, ${score})`
    return { ...m, computed_score: score }
  })
}

export { addToReserve }
