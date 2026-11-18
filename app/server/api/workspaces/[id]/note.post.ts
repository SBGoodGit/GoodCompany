// Private note of the client per workspace (round 2, D28 §F3). Never shown to the contractor,
// no effect on reputation, not part of the contract or the audit trail.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { note } = await readBody<{ note?: string }>(event)
  const { ws, party } = await loadWorkspace(db(), getRouterParam(event, 'id')!, user.id)
  if (party !== 'client') bad('Workspace not found', 404)
  await db()`update negotiation_workspaces set client_note = ${String(note ?? '').slice(0, 10_000)} where id = ${ws.id}`
  return { ok: true }
})
