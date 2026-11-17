export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const res = await db()`delete from contacts where id = ${getRouterParam(event, 'id')!} and owner_id = ${user.id}`
  if (res.count === 0) bad('Contact not found', 404)
  return { ok: true }
})
