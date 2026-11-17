// Loan detail. Applicant: everything. Invited voters: what they need to judge the request (OD6 open:
// purpose, amount, term, rate, projected income; not the supplier's identity). Live tally is hidden
// from voters until the vote is resolved.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const sql = db()
  const [l] = await sql`select * from loan_applications where id = ${getRouterParam(event, 'id')!}`
  if (!l) bad('Loan not found', 404)
  const [inv] = await sql`select status from vote_invitations where loan_application_id = ${l.id} and voter_id = ${user.id}`
  const isApplicant = l.applicant_id === user.id
  if (!isApplicant && !inv) bad('Loan not found', 404)
  const [myVote] = await sql`select choice from votes where application_id = ${l.id} and voter_id = ${user.id}`
  const [tally] = await sql`select count(*)::int as votes, count(*) filter (where choice = 'for')::int as for_votes from votes where application_id = ${l.id}`
  const [se] = await sql`select status, amount, released_at from sub_escrows where loan_application_id = ${l.id}`
  const resolved = l.status !== 'community_voting'
  return {
    role: isApplicant ? 'applicant' : 'voter',
    loan: {
      id: l.id, purpose_category: l.purpose_category, purpose: l.purpose, amount_requested: l.amount_requested, repayment_term_months: l.repayment_term_months,
      interest_rate: l.interest_rate, projected_income: l.projected_income, required_votes: l.required_votes, audience_size: l.audience_size,
      status: l.status, voting_ends_at: l.voting_ends_at,
      ...(isApplicant ? { principal_outstanding: l.principal_outstanding, interest_paid: l.interest_paid, amount_repaid: l.amount_repaid, activated_at: l.activated_at } : {}),
    },
    invitation: inv ?? null, my_vote: myVote?.choice ?? null,
    tally: isApplicant || resolved ? tally : { votes: tally.votes },
    sub_escrow: isApplicant ? se ?? null : null,
  }
})
