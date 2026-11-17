// Sign a prepared action. Requires step-up authentication (§10). Applied once all have signed.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin((tx) => signAction(event, tx, user.id, getRouterParam(event, 'aid')!))
})
