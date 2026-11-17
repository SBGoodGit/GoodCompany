export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<Record<string, any>>(event)
  const [current] = await db()`select * from profiles where user_id = ${user.id}`
  const next = {
    display_name: typeof b.display_name === 'string' && b.display_name.trim() ? b.display_name.trim() : current.display_name,
    description: typeof b.description === 'string' ? b.description : current.description,
    region: typeof b.region === 'string' ? b.region : current.region,
    account_type: ['individual', 'company'].includes(b.account_type) ? b.account_type : current.account_type,
    expertise_tags: Array.isArray(b.expertise_tags) ? b.expertise_tags.map(String).filter(Boolean) : current.expertise_tags,
  }
  const [profile] = await db()`update profiles set ${db()(next)} where user_id = ${user.id} returning *`
  if (typeof b.phone === 'string') await db()`update users set phone = ${b.phone || null} where id = ${user.id}`
  // Users may switch between client / contractor / both; mediator and admin are admin-assigned only.
  if (['client', 'contractor', 'both'].includes(b.role) && ['client', 'contractor', 'both'].includes(user.role)) {
    await db()`update users set role = ${b.role} where id = ${user.id}`
  }
  return { profile }
})
