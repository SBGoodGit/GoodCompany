export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  if (id === 'all') await db()`update notifications set read_at = now() where user_id = ${user.id} and read_at is null`
  else await db()`update notifications set read_at = now() where id = ${id} and user_id = ${user.id}`
  return { ok: true }
})
