export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db()`
    select j.*, (select count(*)::int from negotiation_workspaces w where w.job_id = j.id) as workspace_count
      from jobs j where j.client_id = ${user.id} order by j.created_at desc`
})
