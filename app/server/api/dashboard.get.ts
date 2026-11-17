// Dashboard (§11, v2 §9): active negotiations, contracts, escrow snapshot, deadlines of open
// requests and cases, Community Bank snapshot. All balances simulated.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const sql = db()
  const workspaces = await sql`select w.id, w.stage, j.title, w.last_activity_at from negotiation_workspaces w join jobs j on j.id = w.job_id
                                where (w.client_id = ${user.id} or w.contractor_id = ${user.id}) and w.stage <> 'closed' order by w.last_activity_at desc`
  const contracts = await sql`
    select c.id, c.status, c.currency, c.snapshot->'job'->>'title' as title, case when c.client_id = ${user.id} then 'client' else 'contractor' end as my_party,
           case when c.contractor_id = ${user.id} then coalesce(e.principal_total - e.paid_to_contractor - e.paid_to_suppliers - e.refunded_to_client - e.fee_transferred, 0) end as in_escrow, -- hidden from the client (supplier payments, §7.3)
           coalesce(e.disputed_amount, 0) as disputed
      from contracts c left join escrow_accounts e on e.contract_id = c.id
     where (c.client_id = ${user.id} or c.contractor_id = ${user.id}) order by c.signed_at desc`
  const deadlines = await sql`
    select 'request' as kind, r.contract_id, null::uuid as dispute_id, c.snapshot->'job'->>'title' as title, r.response_due_at as due, r.payment_deadline_at as deadline, r.awaiting_party
      from completion_requests r join contracts c on c.id = r.contract_id
     where r.status = 'open' and r.response_due_at is not null and (c.client_id = ${user.id} or c.contractor_id = ${user.id})
    union all
    select 'case', d.contract_id, d.id, c.snapshot->'job'->>'title', d.mediator_due_at, null, null
      from dispute_cases d join contracts c on c.id = d.contract_id
     where d.status in ('between_parties','mediator_active','advice_issued') and (c.client_id = ${user.id} or c.contractor_id = ${user.id} or (c.mediator_id = ${user.id} and d.mediator_activated_at is not null))
     order by due nulls last`
  const [bal] = await sql`select balance from simulated_balances where user_id = ${user.id}`
  const [bank] = await sql`select coalesce(sum(balance) filter (where type <> 'organization'), 0)::bigint as reserves from reserves`
  const [health] = await sql`select computed_score from community_health_score_snapshots order by computed_at desc limit 1`
  const [votes] = await sql`select count(*)::int as n from vote_invitations where voter_id = ${user.id} and status = 'pending'`
  const notifications = await sql`select * from notifications where user_id = ${user.id} order by created_at desc limit 10`
  return {
    simulated: true, my_simulated_balance: Number(bal?.balance ?? 0), workspaces, contracts, deadlines,
    community_bank: { reserves: Number(bank.reserves), health_score: health?.computed_score ?? null, pending_votes: votes.n },
    notifications,
  }
})
