// The other party rejects a Change Order; a reason is required (July decision).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { response_note } = await readBody<{ response_note?: string }>(event)
  if (!response_note?.trim()) bad('A reason is required to reject a Change Order')
  return db().begin(async (tx) => {
    const { contract } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    const [co] = await tx`select * from change_orders where id = ${getRouterParam(event, 'cid')!} and contract_id = ${contract.id} for update`
    if (!co || co.status !== 'proposed') bad('This Change Order is not open')
    if (co.requested_by === user.id) bad('You cannot reject your own proposal; withdraw it instead')
    await tx`update change_orders set status = 'rejected', response_note = ${response_note.trim()} where id = ${co.id}`
    if (co.escrow_action_id) await tx`update escrow_actions set status = 'rejected', rejection_reason = 'Change Order rejected' where id = ${co.escrow_action_id} and status = 'awaiting_signatures'`
    await tx`insert into change_order_messages (change_order_id, sender_id, body) values (${co.id}, ${user.id}, ${'Rejected: ' + response_note.trim()})`
    await audit(tx, { event_type: 'change_order_rejected', actor_id: user.id, contract_id: contract.id, payload: { change_order_id: co.id } })
    await notify(tx, { user_id: co.requested_by, type: 'change_order', title: 'Your Change Order was rejected', link: `/contracts/${contract.id}` })
    return { ok: true }
  })
})
