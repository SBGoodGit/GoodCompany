export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const res = await db()`delete from portfolio_items where id = ${id}
    and profile_id = (select id from profiles where user_id = ${user.id})`
  if (res.count === 0) bad('Not found', 404)
  return { ok: true }
})
