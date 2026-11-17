// Contract detail with milestones and audit trail. Escrow state is added by the ledger in session 2.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const sql = db()
  const [c] = await sql`select * from contracts where id = ${getRouterParam(event, 'id')!}`
  if (!c || (c.client_id !== user.id && c.contractor_id !== user.id)) bad('Contract not found', 404)
  const milestones = await sql`select * from milestones where contract_id = ${c.id} order by sequence`
  const audit_trail = await sql`
    select a.event_type, a.actor_id, a.payload, a.timestamp, p.display_name as actor_name
      from audit_log_entries a left join profiles p on p.user_id = a.actor_id
     where a.contract_id = ${c.id} or (a.workspace_id = ${c.workspace_id} and a.contract_id is null)
     order by a.timestamp, a.id`
  const signatures = await sql`select user_id, created_at from attestations
                                where subject_type = 'contract_signature' and subject_id = ${c.workspace_id} and payload_hash = ${c.snapshot_hash}`
  const names = Object.fromEntries((await sql`select user_id, display_name from profiles where user_id in (${c.client_id}, ${c.contractor_id}, ${c.mediator_id})`).map((p: any) => [p.user_id, p.display_name]))
  return { contract: c, my_party: c.client_id === user.id ? 'client' : 'contractor', milestones, audit_trail, signatures, names }
})
