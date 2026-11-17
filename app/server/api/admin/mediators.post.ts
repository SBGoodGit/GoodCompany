// Admin creates a Mediator account (P15). No self-registration as Mediator.
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, { roles: ['admin'] })
  const b = await readBody<{ email?: string; display_name?: string; password?: string }>(event)
  if (!b.email?.includes('@') || !b.display_name?.trim() || !b.password || b.password.length < 8) {
    bad('Email, name and a password of at least 8 characters are required')
  }
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email: b.email!.trim().toLowerCase(), password: b.password, email_confirm: true,
    user_metadata: { display_name: b.display_name!.trim() },
  })
  if (error || !data.user) bad(error?.message ?? 'Could not create the account')
  await db().begin(async (tx) => {
    await tx`update users set role = 'mediator' where id = ${data.user!.id}`
    await audit(tx, { event_type: 'mediator_created', actor_id: admin.id, payload: { user_id: data.user!.id } })
  })
  return { id: data.user!.id }
})
