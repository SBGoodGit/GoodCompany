export default defineEventHandler(async (event) => {
  await requireUser(event, { roles: ['admin'] })
  const runs = await db()`select distinct on (job) job, started_at, finished_at, result, error from job_runs order by job, started_at desc`
  return Object.entries(JOBS).map(([name, j]) => ({ name, label: j.label, last: runs.find((r: any) => r.job === name) ?? null }))
})
