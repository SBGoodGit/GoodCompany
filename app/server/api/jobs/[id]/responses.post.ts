// A contractor responds to a job: JobResponse + NegotiationWorkspace(stage = introduction) (v2 §4.1).
import { canRespondAsContractor } from '../../../../shared/jobs'
import { intakeQuestionsFor } from '../../../../shared/intake'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  if (!canRespondAsContractor(user.role)) bad('Only contractors can respond to jobs', 403)
  const id = getRouterParam(event, 'id')!
  const { message } = await readBody<{ message?: string }>(event)
  return db().begin(async (tx) => {
    const [job] = await tx`select * from jobs where id = ${id} for update`
    if (!job) bad('Job not found', 404)
    if (job.client_id === user.id) bad('You cannot respond to your own job')
    if (job.status !== 'open' || job.selected_contractor_id) bad('This job is not open for responses')
    const [existing] = await tx`select id from negotiation_workspaces where job_id = ${id} and contractor_id = ${user.id}`
    if (existing) bad('You already have a workspace for this job', 409)
    const [ws] = await tx`
      insert into negotiation_workspaces (job_id, client_id, contractor_id) values (${id}, ${job.client_id}, ${user.id}) returning *`
    await tx`insert into job_responses (job_id, contractor_id, negotiation_workspace_id) values (${id}, ${user.id}, ${ws.id})`
    for (const q of intakeQuestionsFor(job.category)) {
      await tx`insert into technical_intake_answers (workspace_id, question_key, question_text, required)
               values (${ws.id}, ${q.key}, ${q.text}, ${q.required})`
    }
    if (message?.trim()) await tx`insert into messages (workspace_id, sender_id, body) values (${ws.id}, ${user.id}, ${message.trim()})`
    await audit(tx, { event_type: 'workspace_opened', actor_id: user.id, workspace_id: ws.id, payload: { job_id: id } })
    await notify(tx, { user_id: job.client_id, type: 'job_response', title: `New response to "${job.title}"`, link: `/workspaces/${ws.id}` })
    return ws
  })
})
