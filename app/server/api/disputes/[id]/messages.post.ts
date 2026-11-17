export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { body } = await readBody<{ body?: string }>(event)
  if (!body?.trim()) bad('Message is empty')
  return db().begin(async (tx) => {
    const { dispute: d, contract: k, role } = await loadDispute(tx, getRouterParam(event, 'id')!, user.id)
    if (['settled', 'withdrawn'].includes(d.status)) bad('This case is closed')
    const [m] = await tx`insert into dispute_messages (dispute_case_id, sender_id, body) values (${d.id}, ${user.id}, ${body.trim()}) returning *`
    if (role !== 'mediator') await tx`update dispute_cases set last_party_activity_at = now() where id = ${d.id}`
    for (const uid of [k.client_id, k.contractor_id, d.mediator_activated_at ? k.mediator_id : null].filter((x) => x && x !== user.id)) {
      await notify(tx, { user_id: uid as string, type: 'dispute_message', title: 'New message in a case', link: uid === k.mediator_id ? `/mediator/cases/${d.id}` : `/disputes/${d.id}` })
    }
    return m
  })
})
