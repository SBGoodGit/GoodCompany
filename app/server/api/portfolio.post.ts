export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<{ title?: string; description?: string; media_urls?: string[] }>(event)
  if (!b.title?.trim()) bad('Title is required')
  const [profile] = await db()`select id from profiles where user_id = ${user.id}`
  const urls = (b.media_urls ?? []).map(String).filter((u) => /^https?:\/\//.test(u))
  const [item] = await db()`insert into portfolio_items (profile_id, title, description, media_urls)
    values (${profile.id}, ${b.title.trim()}, ${b.description ?? ''}, ${urls}) returning *`
  return item
})
