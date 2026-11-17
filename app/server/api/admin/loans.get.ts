export default defineEventHandler(async (event) => {
  await requireUser(event, { roles: ['admin'] })
  return db()`select l.id, l.purpose_category, l.amount_requested, l.status, l.principal_outstanding, l.required_votes, l.voting_ends_at, u.email as applicant
                from loan_applications l join users u on u.id = l.applicant_id order by l.created_at desc limit 100`
})
