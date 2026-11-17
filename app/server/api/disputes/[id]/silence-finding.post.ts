// The Mediator records why a party is silent; required before advice on the substance in a silence case (§8.4).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { roles: ['mediator'] })
  const { finding } = await readBody<{ finding?: string }>(event)
  if (!finding?.trim()) bad('Describe the finding')
  return db().begin(async (tx) => {
    const { dispute: d, contract: k } = await requireMediator(tx, getRouterParam(event, 'id')!, user.id)
    await tx`update dispute_cases set silence_investigation = ${finding.trim()} where id = ${d.id}`
    await audit(tx, { event_type: 'mediator_silence_finding', actor_id: user.id, contract_id: k.id, payload: { dispute_id: d.id } })
    return { ok: true }
  })
})
