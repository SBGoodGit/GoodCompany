// Manual default (§9.7): no automated detection in MVP1. The outstanding principal was already
// taken from the Credit Reserve at disbursement; this records the write-off and feeds the health score.
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, { roles: ['admin'] })
  return db().begin(async (tx) => {
    const [l] = await tx`select * from loan_applications where id = ${getRouterParam(event, 'id')!} for update`
    if (!l || l.status !== 'active') bad('Only an active loan can be marked defaulted')
    await tx`update loan_applications set status = 'defaulted' where id = ${l.id}`
    await tx`insert into ledger_transactions (source_type, amount, reserve_type, related_loan_id) values ('default_writeoff', 0, 'credit', ${l.id})`
    await audit(tx, { event_type: 'loan_defaulted', actor_id: admin.id, payload: { loan_id: l.id, outstanding: l.principal_outstanding } })
    return { ok: true }
  })
})
