// The client rejects a proposed terms version, or asks for a revision with a mandatory comment
// (round 2, D28 §A1). The workspace stays in the terms stage; the contractor may propose a new version.
// Body: { decision: 'reject' | 'revise', comment }
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<{ decision?: string; comment?: string }>(event)
  if (b.decision !== 'reject' && b.decision !== 'revise') bad('Decision must be reject or revise')
  const comment = String(b.comment ?? '').trim()
  if (b.decision === 'revise' && !comment) bad('Say what should change: a comment is required to ask for a revision')
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'terms')
    if (party !== 'client') bad('The client responds to the proposed terms')
    const [v] = await tx`select * from terms_versions where id = ${getRouterParam(event, 'vid')!} and workspace_id = ${ws.id}`
    if (!v || v.status !== 'proposed') bad('This terms version is not open for a response')
    const status = b.decision === 'revise' ? 'revision_requested' : 'rejected'
    await tx`update terms_versions set status = ${status}, client_comment = ${comment || null} where id = ${v.id}`
    await touch(tx, ws.id)
    await audit(tx, { event_type: b.decision === 'revise' ? 'terms_revision_requested' : 'terms_rejected', actor_id: user.id, workspace_id: ws.id, payload: { version_number: v.version_number } })
    await notify(tx, {
      user_id: ws.contractor_id, type: 'terms_response', link: `/workspaces/${ws.id}`,
      title: b.decision === 'revise' ? `The client asks for a revision of terms version ${v.version_number}` : `The client rejected terms version ${v.version_number}`,
      body: comment || undefined,
    })
    return { status }
  })
})
