// Either party withdraws at any stage before signing; no financial consequence (§9.2).
// When the client closes a candidate in the technical intake or terms, that counts as a swap (D28 §E).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireOpen(ws)
    await closeWorkspace(tx, ws, 'withdrawn', user.id)
    await audit(tx, { event_type: 'workspace_withdrawn', actor_id: user.id, workspace_id: ws.id, payload: { party, from_stage: ws.stage } })
    await notify(tx, { user_id: otherParty(ws, party), type: 'workspace_withdrawn', title: 'The other party withdrew from a workspace', link: `/workspaces/${ws.id}` })
    return { ok: true }
  })
})
