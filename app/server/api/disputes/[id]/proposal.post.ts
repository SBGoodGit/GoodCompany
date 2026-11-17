// A mediation proposal. No ledger effect: the parties execute it themselves through `settle`.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { roles: ['mediator'] })
  const { proposal } = await readBody<{ proposal?: string }>(event)
  if (!proposal?.trim()) bad('Write the proposal')
  return db().begin(async (tx) => {
    const { dispute: d, contract: k } = await requireMediator(tx, getRouterParam(event, 'id')!, user.id)
    await tx`update dispute_cases set proposal = ${proposal.trim()} where id = ${d.id}`
    await audit(tx, { event_type: 'mediator_proposal', actor_id: user.id, contract_id: k.id, payload: { dispute_id: d.id } })
    await notifyParties(tx, k, 'The Mediator made a mediation proposal', 'If you both agree, execute it as a settlement.', `/disputes/${d.id}`)
    return { ok: true }
  })
})
