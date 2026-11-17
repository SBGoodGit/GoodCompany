// Step-up authentication (§2.3, §10): the user re-enters their password; a single-use grant
// valid for a few minutes is returned and must accompany the next signature.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { password } = await readBody<{ password?: string }>(event)
  if (!password) bad('Password required')
  const anon = supabaseAnon()
  const { data, error } = await anon.auth.signInWithPassword({ email: user.email, password })
  if (error || !data.session) bad('Password incorrect', 401)
  await supabaseAdmin().auth.admin.signOut(data.session.access_token, 'local').catch(() => {})
  const settings = await getSettings()
  const minutes = Number(settings.step_up_validity_minutes ?? 5)
  const [grant] = await db()`
    insert into step_up_grants (user_id, expires_at) values (${user.id}, now() + make_interval(mins => ${minutes}))
    returning id, expires_at`
  return { token: grant.id, expires_at: grant.expires_at }
})
