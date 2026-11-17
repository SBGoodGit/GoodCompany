// Job status (v2 §3.1): open → closed, open ⇄ dormant, dormant → closed. Manual, client only.
const ALLOWED: Record<string, string[]> = { open: ['closed', 'dormant'], dormant: ['open', 'closed'], closed: [] }

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const { status } = await readBody<{ status?: string }>(event)
  const [job] = await db()`select * from jobs where id = ${id}`
  if (!job || job.client_id !== user.id) bad('Job not found', 404)
  if (!status || !ALLOWED[job.status]?.includes(status)) bad(`Cannot change status from ${job.status} to ${status}`)
  const [updated] = await db()`update jobs set status = ${status} where id = ${id} returning *`
  return updated
})
