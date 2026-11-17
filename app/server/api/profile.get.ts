export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const [profile] = await db()`select * from profiles where user_id = ${user.id}`
  const portfolio = await db()`select * from portfolio_items where profile_id = ${profile.id} order by created_at desc`
  const [u] = await db()`select phone from users where id = ${user.id}`
  // Reviews received, with motivation: private to reviewer and reviewee (§3.1). The own score is
  // visible to the user internally from the first completed contract (Rookie Stage).
  const reviews = await db()`select r.rating, r.motivation, r.reviewee_role, r.created_at, p.display_name as reviewer
                               from reviews r join profiles p on p.user_id = r.reviewer_id where r.reviewee_id = ${user.id} order by r.created_at desc`
  const warranty = await warrantyMetricsFor(db(), user.id)
  return { user: { ...user, phone: u.phone }, profile, portfolio, reviews, warranty }
})
