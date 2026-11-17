// Each Change Order has its own conversation, part of the contract's audit file.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { body } = await readBody<{ body?: string }>(event)
  if (!body?.trim()) bad('Message is empty')
  return db().begin(async (tx) => {
    const { contract, party } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    const [co] = await tx`select id from change_orders where id = ${getRouterParam(event, 'cid')!} and contract_id = ${contract.id}`
    if (!co) bad('Change Order not found', 404)
    const [m] = await tx`insert into change_order_messages (change_order_id, sender_id, body) values (${co.id}, ${user.id}, ${body.trim()}) returning *`
    await audit(tx, { event_type: 'change_order_message', actor_id: user.id, contract_id: contract.id, payload: { change_order_id: co.id } })
    await notify(tx, { user_id: party === 'client' ? contract.contractor_id : contract.client_id, type: 'change_order', title: 'New message on a Change Order', link: `/contracts/${contract.id}` })
    return m
  })
})
