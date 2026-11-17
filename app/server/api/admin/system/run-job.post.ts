// Run one system job now, or all of them. Same idempotent code as the scheduler.
export default defineEventHandler(async (event) => {
  await requireUser(event, { roles: ['admin'] })
  const { job } = await readBody<{ job?: string }>(event)
  if (job === 'all') {
    const out = []
    for (const name of Object.keys(JOBS)) out.push(await runJob(name))
    return out
  }
  return runJob(String(job))
})
