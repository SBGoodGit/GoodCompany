export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const [profile] = await db()`select * from profiles where user_id = ${user.id}`
  const portfolio = await db()`select * from portfolio_items where profile_id = ${profile.id} order by created_at desc`
  const [u] = await db()`select phone from users where id = ${user.id}`
  return { user: { ...user, phone: u.phone }, profile, portfolio }
})
