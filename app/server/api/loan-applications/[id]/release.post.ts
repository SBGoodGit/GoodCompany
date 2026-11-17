export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin(async (tx) => {
    await ledgerCall(() => releaseSubEscrow(tx, getRouterParam(event, 'id')!, user.id))
    return { ok: true }
  })
})
