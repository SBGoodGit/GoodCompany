// Admin assigns a Mediator to a contract (P15), through the ledger, while no Mediator is active on a case.
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, { roles: ['admin'] })
  const { mediator_id } = await readBody<{ mediator_id?: string }>(event)
  return db().begin(async (tx) => {
    const [m] = await tx`select id from users where id = ${mediator_id ?? null} and role = 'mediator' and status = 'active'`
    if (!m) bad('Not an active Mediator')
    await ledgerCall(() => ledgerFor(tx).assignMediator(getRouterParam(event, 'id')!, m.id, admin.id))
    await audit(tx, { event_type: 'mediator_assigned', actor_id: admin.id, contract_id: getRouterParam(event, 'id')!, payload: { mediator_id: m.id } })
    return { ok: true }
  })
})
