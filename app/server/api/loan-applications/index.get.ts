// My applications and the applications I am invited to vote on.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const sql = db()
  const mine = await sql`select id, purpose_category, amount_requested, repayment_term_months, interest_rate, status, required_votes, voting_ends_at, principal_outstanding, created_at
                          from loan_applications where applicant_id = ${user.id} order by created_at desc`
  const invited = await sql`select l.id, l.purpose_category, l.amount_requested, l.status, l.voting_ends_at, i.status as invitation_status
                             from vote_invitations i join loan_applications l on l.id = i.loan_application_id
                            where i.voter_id = ${user.id} and i.status <> 'closed' order by l.created_at desc`
  return { mine, invited }
})
