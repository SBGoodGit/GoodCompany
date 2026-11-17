// Extension: the Mediator alone decides, with a reason and a new date; both parties are notified (§8.3).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, { roles: ['mediator'] })
  const { reason, new_due_at } = await readBody<{ reason?: string; new_due_at?: string }>(event)
  if (!reason?.trim()) bad('A reason is required')
  const due = new Date(String(new_due_at ?? ''))
  if (Number.isNaN(due.getTime())) bad('Choose a new date')
  return db().begin(async (tx) => {
    const { dispute: d, contract: k } = await requireMediator(tx, getRouterParam(event, 'id')!, user.id)
    if (d.mediator_due_at && due <= new Date(d.mediator_due_at)) bad('The new date must be later than the current due date')
    const ext = [...(d.extensions ?? []), { reason: reason.trim(), new_due_at: due.toISOString(), notified_at: new Date().toISOString() }]
    await tx`update dispute_cases set mediator_due_at = ${due}, extensions = ${tx.json(ext as never)} where id = ${d.id}`
    await audit(tx, { event_type: 'mediator_extension', actor_id: user.id, contract_id: k.id, payload: { dispute_id: d.id, new_due_at: due.toISOString() } })
    await notifyParties(tx, k, 'The Mediator extended the mediator period', `New date: ${due.toISOString().slice(0, 10)}. Reason: ${reason.trim()}`, `/disputes/${d.id}`)
    return { ok: true }
  })
})
