export default defineEventHandler(async (event) => {
  await requireUser(event, { roles: ['admin'] })
  return db()`select l.id, l.purpose_category, l.purpose, l.amount_requested, l.repayment_term_months, l.interest_rate, l.projected_income,
                     l.status, l.principal_outstanding, l.required_votes, l.voting_ends_at, l.admin_check_note, l.created_at,
                     u.email as applicant, s.email as supplier
                from loan_applications l join users u on u.id = l.applicant_id join users s on s.id = l.supplier_id
               order by (l.status = 'admin_check') desc, l.created_at desc limit 100`
})
