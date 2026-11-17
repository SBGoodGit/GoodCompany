// Tell both parties the advice will be finalised; the advice may follow no earlier than
// advice_notice_hours (48) later (P3).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { roles: ['mediator'] })
  return db().begin(async (tx) => {
    const { dispute: d, contract: k } = await requireMediator(tx, getRouterParam(event, 'id')!, user.id)
    if (d.status !== 'mediator_active') bad('The advice has already been issued')
    const settings = await getSettings(tx)
    const hours = Number(settings.advice_notice_hours ?? 48)
    await tx`update dispute_cases set advice_notice_at = now() where id = ${d.id}`
    await audit(tx, { event_type: 'mediator_advice_notice', actor_id: user.id, contract_id: k.id, payload: { dispute_id: d.id } })
    await notifyParties(tx, k, 'The Mediator will finalise the advice', `The advice will be issued no earlier than ${hours} hours from now. Add anything you want considered before then.`, `/disputes/${d.id}`)
    return { ok: true }
  })
})
