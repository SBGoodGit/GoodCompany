export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db()`
    select c.id, c.status, c.signed_at, c.currency, c.snapshot->'quote'->>'total_amount' as total_amount, j.title as job_title,
           case when c.client_id = ${user.id} then 'client' else 'contractor' end as my_party,
           p.display_name as other_party_name
      from contracts c join jobs j on j.id = c.job_id
      join profiles p on p.user_id = case when c.client_id = ${user.id} then c.contractor_id else c.client_id end
     where c.client_id = ${user.id} or c.contractor_id = ${user.id}
     order by c.signed_at desc`
})
