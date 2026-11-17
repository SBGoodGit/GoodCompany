// Admin assigns a Mediator to one workspace (P15); used for the next terms versions.
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, { roles: ['admin'] })
  const { mediator_id } = await readBody<{ mediator_id?: string }>(event)
  return db().begin(async (tx) => {
    const [m] = await tx`select id from users where id = ${mediator_id ?? null} and role = 'mediator' and status = 'active'`
    if (!m) bad('Not an active Mediator')
    const [ws] = await tx`update negotiation_workspaces set mediator_id = ${m.id} where id = ${getRouterParam(event, 'id')!} and stage <> 'closed' returning id`
    if (!ws) bad('Open workspace not found', 404)
    await audit(tx, { event_type: 'mediator_assigned', actor_id: admin.id, workspace_id: ws.id, payload: { mediator_id: m.id } })
    return { ok: true }
  })
})
