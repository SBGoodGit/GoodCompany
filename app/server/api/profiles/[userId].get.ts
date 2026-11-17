// Public profile. Reputation scores are shown only after the Rookie Stage (§3.1.1);
// the client score is not computed or shown in MVP1 (O25 deferred).
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const userId = getRouterParam(event, 'userId')!
  const [row] = await db()`
    select p.*, u.role, public.identity_level(u.id) as identity_level
      from profiles p join users u on u.id = p.user_id
     where p.user_id = ${userId} and u.status = 'active'`
  if (!row) bad('Profile not found', 404)
  const settings = await getSettings()
  const rookie = Number(settings.rookie_reviews_required ?? 10)
  const portfolio = await db()`select id, title, description, media_urls from portfolio_items where profile_id = ${row.id} order by created_at desc`
  return {
    user_id: row.user_id,
    display_name: row.display_name,
    description: row.description,
    account_type: row.account_type,
    region: row.region,
    role: row.role,
    expertise_tags: row.expertise_tags,
    badges: row.identity_level === 'email_verified' ? ['Email verified'] : [],
    completed_as_contractor: row.completed_as_contractor,
    completed_as_client: row.completed_as_client,
    stats_completed_jobs: row.stats_completed_jobs,
    reputation_public: row.completed_as_contractor >= rookie,
    reputation_score_as_contractor: row.completed_as_contractor >= rookie ? row.reputation_score_as_contractor : null,
    rookie_reviews_required: rookie,
    portfolio,
  }
})
