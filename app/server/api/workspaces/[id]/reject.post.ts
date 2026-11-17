// The client rejects the contract at preview → closed(rejected) (v2 §3.2).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { reason } = await readBody<{ reason?: string }>(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'contract_preview')
    if (party !== 'client') bad('Only the client can reject the contract; the contractor can withdraw')
    await tx`update negotiation_workspaces set stage = 'closed', outcome = 'rejected', closed_at = now(), last_activity_at = now() where id = ${ws.id}`
    await audit(tx, { event_type: 'workspace_rejected', actor_id: user.id, workspace_id: ws.id, payload: { reason: reason ?? '' } })
    await notify(tx, { user_id: ws.contractor_id, type: 'workspace_rejected', title: 'The client did not accept the contract', link: `/workspaces/${ws.id}` })
    return { ok: true }
  })
})
