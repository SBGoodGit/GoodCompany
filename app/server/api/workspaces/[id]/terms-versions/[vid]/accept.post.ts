// The client accepts the contractor's terms version → workspace moves to the quote stage (round 2:
// only the contractor proposes terms). From here the candidate counts towards the quote limit (D28 §E).
// Accepting the terms also accepts the named Mediator (Protocol v1 "Parties and keys").
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'terms')
    const [v] = await tx`select * from terms_versions where id = ${getRouterParam(event, 'vid')!} and workspace_id = ${ws.id}`
    if (!v || v.status !== 'proposed') bad('This terms version cannot be accepted')
    if (party !== 'client' || v.proposed_by === user.id) bad('The client accepts the terms the contractor proposed')
    await tx`update terms_versions set status = 'accepted', accepted_by = ${user.id}, accepted_at = now() where id = ${v.id}`
    await touch(tx, ws.id, { stage: 'quote', reached_quote_at: new Date() })
    await audit(tx, { event_type: 'terms_accepted', actor_id: user.id, workspace_id: ws.id, payload: { version_number: v.version_number, terms_version_id: v.id } })
    await notify(tx, { user_id: otherParty(ws, party), type: 'terms_accepted', title: `Terms version ${v.version_number} accepted`, link: `/workspaces/${ws.id}` })
    return { stage: 'quote' }
  })
})
