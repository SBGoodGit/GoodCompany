// Final evaluation, my invoices for this contract and the reviews. A review's motivation is
// private to reviewer and reviewee (both parties of this contract).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const sql = db()
  const { contract } = await loadContractForParty(sql, getRouterParam(event, 'id')!, user.id)
  const [evaluation] = await sql`select * from final_evaluations where contract_id = ${contract.id}`
  const invoices = await sql`select id, direction, kind, amount, currency, status, external_reference_id, created_at from invoices
                              where contract_id = ${contract.id} and user_id = ${user.id} order by created_at`
  const reviews = await sql`select reviewer_id, reviewee_id, reviewee_role, rating, motivation, created_at from reviews where contract_id = ${contract.id}`
  return { evaluation: evaluation ?? null, invoices, reviews, can_review: ['completed', 'closed'].includes(contract.status) && !reviews.some((r: any) => r.reviewer_id === user.id) }
})
