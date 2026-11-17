// Non-binding advice (D21). Rejected before the 48-hour notice has run, and in a silence case
// before the silence finding. No ledger effect: if both parties accept it, they settle.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { roles: ['mediator'] })
  const { content, reasoning } = await readBody<{ content?: string; reasoning?: string }>(event)
  if (!content?.trim() || !reasoning?.trim()) bad('Advice and reasoning are both required')
  return db().begin(async (tx) => {
    const { dispute: d, contract: k } = await requireMediator(tx, getRouterParam(event, 'id')!, user.id)
    if (d.status !== 'mediator_active') bad('The advice has already been issued')
    if (!d.advice_notice_at) bad('Notify both parties first; the advice may follow 48 hours after the notice')
    const settings = await getSettings(tx)
    const ready = new Date(new Date(d.advice_notice_at).getTime() + Number(settings.advice_notice_hours ?? 48) * 3_600_000)
    if (ready > new Date()) bad(`The notice period runs until ${ready.toISOString().replace('T', ' ').slice(0, 16)} UTC`)
    if (d.trigger === 'silence' && !d.silence_investigation) bad('In a silence case, record why the party is silent before advising on the substance')
    const advice = { content: content.trim(), reasoning: reasoning.trim(), issued_at: new Date().toISOString() }
    await tx`update dispute_cases set advice = ${tx.json(advice)}, status = 'advice_issued' where id = ${d.id}`
    await audit(tx, { event_type: 'mediator_advice_issued', actor_id: user.id, contract_id: k.id, payload: { dispute_id: d.id } })
    await notifyParties(tx, k, 'The Mediator issued non-binding advice', 'If you both accept it, execute it as a settlement. Otherwise the disputed amount stays frozen until you settle.', `/disputes/${d.id}`)
    return { ok: true }
  })
})
