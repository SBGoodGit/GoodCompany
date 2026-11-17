// The client asks for information: a response that hands the turn to the contractor.
// It does not stop the payment deadline (§4.2).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { body } = await readBody<{ body?: string }>(event)
  if (!body?.trim()) bad('Write your question')
  return db().begin(async (tx) => {
    const { contract, party } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    if (party !== 'client') bad('Only the client asks for information')
    const [r] = await tx`select * from completion_requests where id = ${getRouterParam(event, 'rid')!} and contract_id = ${contract.id} for update`
    if (!r || r.status !== 'open') bad('This request is not open')
    await tx`insert into completion_request_messages (completion_request_id, sender_id, kind, body) values (${r.id}, ${user.id}, 'information_request', ${body.trim()})`
    await tx`update completion_requests set awaiting_party = 'contractor', last_party_action_at = now() where id = ${r.id}`
    await audit(tx, { event_type: 'information_requested', actor_id: user.id, contract_id: contract.id, payload: { completion_request_id: r.id } })
    await notify(tx, { user_id: contract.contractor_id, type: 'information_request', title: 'The client asks for information about your request', link: `/contracts/${contract.id}` })
    return { ok: true }
  })
})
