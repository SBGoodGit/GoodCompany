export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db()`
    select w.id, w.stage, w.outcome, w.last_activity_at, w.job_id, j.title as job_title,
           case when w.client_id = ${user.id} then 'client' else 'contractor' end as my_party,
           p.display_name as other_party_name, c.id as contract_id
      from negotiation_workspaces w
      join jobs j on j.id = w.job_id
      join profiles p on p.user_id = case when w.client_id = ${user.id} then w.contractor_id else w.client_id end
      left join contracts c on c.workspace_id = w.id
     where w.client_id = ${user.id} or w.contractor_id = ${user.id}
     order by w.last_activity_at desc`
})
