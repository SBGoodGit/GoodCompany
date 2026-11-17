// Extra work after a completion request or during warranty (§4.5, D11): a new contract linked to
// this one, with its own escrow. It starts as a workspace in the terms stage; signing it requires
// the payout or a part-payment of this contract (checked at signing).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { message } = await readBody<{ message?: string }>(event)
  return db().begin(async (tx) => {
    const { contract, party } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    const [finalReq] = await tx`select id from completion_requests where contract_id = ${contract.id} and is_final`
    if (!finalReq && !['completed', 'closed'].includes(contract.status)) {
      bad('Extra work during execution is a Change Order; a linked contract is for work after the final completion request or during warranty')
    }
    const [open] = await tx`select id from negotiation_workspaces where parent_contract_id = ${contract.id} and stage <> 'closed'`
    if (open) bad('A negotiation for extra work is already open', 409)
    const [ws] = await tx`
      insert into negotiation_workspaces (job_id, client_id, contractor_id, parent_contract_id, stage, mediator_id, reached_beyond_introduction)
      values (${contract.job_id}, ${contract.client_id}, ${contract.contractor_id}, ${contract.id}, 'terms', ${contract.mediator_id}, true)
      returning *`
    if (message?.trim()) await tx`insert into messages (workspace_id, sender_id, body) values (${ws.id}, ${user.id}, ${message.trim()})`
    await audit(tx, { event_type: 'nested_negotiation_opened', actor_id: user.id, contract_id: contract.id, workspace_id: ws.id })
    await notify(tx, { user_id: party === 'client' ? contract.contractor_id : contract.client_id, type: 'nested', title: 'Extra work proposed as a linked contract', link: `/workspaces/${ws.id}` })
    return ws
  })
})
