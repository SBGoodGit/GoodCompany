// Client constraints for the work (round 2, D28 §A2): the period in which the work can be done,
// available days and access/logistics on location. The contractor sees them while drafting.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<{ start?: string | null; end?: string | null; days?: string; access?: string }>(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'introduction', 'technical_intake', 'terms', 'quote')
    if (party !== 'client') bad('Only the client states the constraints')
    const date = (v?: string | null) => {
      if (!v) return null
      if (!/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(v))) bad('Enter dates as YYYY-MM-DD')
      return v
    }
    const start = date(b.start), end = date(b.end)
    if (start && end && start > end) bad('The end of the period cannot be before its start')
    await tx`update negotiation_workspaces set constraint_start = ${start}, constraint_end = ${end},
               constraint_days = ${String(b.days ?? '').trim()}, constraint_access = ${String(b.access ?? '').trim()} where id = ${ws.id}`
    await touch(tx, ws.id)
    await notify(tx, { user_id: ws.contractor_id, type: 'workspace_constraints', title: 'The client updated the constraints for the work', link: `/workspaces/${ws.id}` })
    return { ok: true }
  })
})
