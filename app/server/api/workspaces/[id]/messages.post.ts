export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { body } = await readBody<{ body?: string }>(event)
  if (!body?.trim()) bad('Message is empty')
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireOpen(ws)
    const [m] = await tx`insert into messages (workspace_id, sender_id, body) values (${ws.id}, ${user.id}, ${body.trim()}) returning *`
    await touch(tx, ws.id)
    await notify(tx, { user_id: otherParty(ws, party), type: 'workspace_message', title: 'New message in a workspace', link: `/workspaces/${ws.id}` })
    return m
  })
})
