// Either party withdraws at any stage before signing; no financial consequence (§9.2).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireOpen(ws)
    await tx`update negotiation_workspaces set stage = 'closed', outcome = 'withdrawn', closed_at = now(), last_activity_at = now() where id = ${ws.id}`
    await audit(tx, { event_type: 'workspace_withdrawn', actor_id: user.id, workspace_id: ws.id, payload: { party } })
    await notify(tx, { user_id: otherParty(ws, party), type: 'workspace_withdrawn', title: 'The other party withdrew from a workspace', link: `/workspaces/${ws.id}` })
    return { ok: true }
  })
})
