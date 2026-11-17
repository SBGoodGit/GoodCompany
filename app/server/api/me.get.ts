export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const [profile] = await db()`select * from profiles where user_id = ${user.id}`
  const [{ count }] = await db()`select count(*)::int as count from notifications where user_id = ${user.id} and read_at is null`
  return { user, profile, unread_notifications: count }
})
