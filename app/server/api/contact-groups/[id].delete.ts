export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const res = await db()`delete from contact_groups where id = ${getRouterParam(event, 'id')!} and owner_id = ${user.id}`
  if (res.count === 0) bad('Group not found', 404)
  return { ok: true }
})
