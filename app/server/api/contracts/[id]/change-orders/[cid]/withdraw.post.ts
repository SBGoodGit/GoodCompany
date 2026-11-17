// The proposer may withdraw a Change Order until it takes effect (P12).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin(async (tx) => {
    const { contract } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    const [co] = await tx`select * from change_orders where id = ${getRouterParam(event, 'cid')!} and contract_id = ${contract.id} for update`
    if (!co || co.status !== 'proposed') bad('This Change Order is not open')
    if (co.requested_by !== user.id) bad('Only the proposer can withdraw')
    await tx`update change_orders set status = 'withdrawn' where id = ${co.id}`
    if (co.escrow_action_id) await tx`update escrow_actions set status = 'rejected', rejection_reason = 'Change Order withdrawn' where id = ${co.escrow_action_id} and status = 'awaiting_signatures'`
    await audit(tx, { event_type: 'change_order_withdrawn', actor_id: user.id, contract_id: contract.id, payload: { change_order_id: co.id } })
    return { ok: true }
  })
})
