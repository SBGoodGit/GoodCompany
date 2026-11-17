export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db()`select * from notifications where user_id = ${user.id} order by created_at desc limit 50`
})
