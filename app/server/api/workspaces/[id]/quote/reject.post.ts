// Client rejects the submitted quote; the contractor may submit a new one.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { reason } = await readBody<{ reason?: string }>(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'quote')
    if (party !== 'client') bad('Only the client rejects a quote')
    const [q] = await tx`select id from quotes where workspace_id = ${ws.id} and status = 'submitted' order by created_at desc limit 1`
    if (!q) bad('There is no quote to reject')
    await tx`update quotes set status = 'rejected', decided_at = now() where id = ${q.id}`
    if (reason?.trim()) await tx`insert into messages (workspace_id, sender_id, body) values (${ws.id}, ${user.id}, ${'Quote rejected: ' + reason.trim()})`
    await touch(tx, ws.id)
    await audit(tx, { event_type: 'quote_rejected', actor_id: user.id, workspace_id: ws.id, payload: { quote_id: q.id } })
    await notify(tx, { user_id: ws.contractor_id, type: 'quote_rejected', title: 'Your quote was rejected', link: `/workspaces/${ws.id}` })
    return { ok: true }
  })
})
