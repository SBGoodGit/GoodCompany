// Client accepts the submitted quote → contract preview.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'quote')
    if (party !== 'client') bad('Only the client accepts a quote')
    const [q] = await tx`select * from quotes where workspace_id = ${ws.id} and status = 'submitted' order by created_at desc limit 1`
    if (!q) bad('There is no quote to accept')
    await tx`update quotes set status = 'accepted', decided_at = now() where id = ${q.id}`
    await touch(tx, ws.id, { stage: 'contract_preview' })
    await audit(tx, { event_type: 'quote_accepted', actor_id: user.id, workspace_id: ws.id, payload: { quote_id: q.id } })
    await notify(tx, { user_id: ws.contractor_id, type: 'quote_accepted', title: 'Your quote was accepted', link: `/workspaces/${ws.id}` })
    return { stage: 'contract_preview' }
  })
})
