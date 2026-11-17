import { jobForViewer } from '../../../shared/jobs'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const sql = db()
  const [job] = await sql`
    select j.*, p.display_name as client_name from jobs j join profiles p on p.user_id = j.client_id where j.id = ${id}`
  if (!job) bad('Job not found', 404)
  const isOwner = job.client_id === user.id
  const workspaces = isOwner
    ? await sql`
        select w.id, w.stage, w.outcome, w.contractor_id, p.display_name as contractor_name, w.last_activity_at
          from negotiation_workspaces w join profiles p on p.user_id = w.contractor_id
         where w.job_id = ${id} order by w.created_at`
    : await sql`select id, stage, outcome from negotiation_workspaces where job_id = ${id} and contractor_id = ${user.id}`
  return { job: jobForViewer(job, user.id), is_owner: isOwner, workspaces }
})
