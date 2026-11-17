export default defineEventHandler(async (event) => {
  await requireUser(event, { roles: ['admin'] })
  const settings = await getSettings()
  const mediators = await db()`select u.id, u.email, u.status, p.display_name from users u join profiles p on p.user_id = u.id
                                 where u.role = 'mediator' order by p.display_name`
  return { mediators, default_mediator_id: settings.default_mediator_id }
})
