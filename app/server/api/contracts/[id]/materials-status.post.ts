// materials_ordered: a status update by the contractor, nothing more (D12, O20).
// No approval, no response window, no Mediator trigger.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { note } = await readBody<{ note?: string }>(event)
  return db().begin(async (tx) => {
    const { contract, party } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    if (party !== 'contractor') bad('Only the contractor posts a materials status')
    if (contract.status !== 'active') bad('The contract is not active')
    await tx`insert into materials_status_updates (contract_id, status, note, created_by) values (${contract.id}, 'materials_ordered', ${note ?? ''}, ${user.id})`
    await audit(tx, { event_type: 'materials_ordered', actor_id: user.id, contract_id: contract.id })
    await notify(tx, { user_id: contract.client_id, type: 'materials_ordered', title: 'The contractor has ordered the materials', link: `/contracts/${contract.id}` })
    return { ok: true }
  })
})
