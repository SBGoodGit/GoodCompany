export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { body } = await readBody<{ body?: string }>(event)
  if (!body?.trim()) bad('Write your answer')
  return db().begin(async (tx) => {
    const { contract, party } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    if (party !== 'contractor') bad('Only the contractor answers')
    const [r] = await tx`select * from completion_requests where id = ${getRouterParam(event, 'rid')!} and contract_id = ${contract.id} for update`
    if (!r || r.status !== 'open') bad('This request is not open')
    await tx`insert into completion_request_messages (completion_request_id, sender_id, kind, body) values (${r.id}, ${user.id}, 'information_response', ${body.trim()})`
    await tx`update completion_requests set awaiting_party = 'client', last_party_action_at = now() where id = ${r.id}`
    await audit(tx, { event_type: 'information_provided', actor_id: user.id, contract_id: contract.id, payload: { completion_request_id: r.id } })
    await notify(tx, { user_id: contract.client_id, type: 'information_response', title: 'The contractor answered your question', link: `/contracts/${contract.id}` })
    return { ok: true }
  })
})
