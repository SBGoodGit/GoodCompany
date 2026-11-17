// Case file: reason, amounts, timeline, deadlines (§5.5).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const sql = db()
  const { dispute: d, contract: k, role } = await loadDispute(sql, getRouterParam(event, 'id')!, user.id)
  const [request] = d.completion_request_id ? await sql`select * from completion_requests where id = ${d.completion_request_id}` : []
  const [milestone] = request ? await sql`select sequence, kind, description, amount, evidence_required from milestones where id = ${request.milestone_id}` : []
  const info = request ? await sql`select kind, body, created_at, sender_id from completion_request_messages where completion_request_id = ${request.id} order by created_at` : []
  const messages = await sql`select m.id, m.sender_id, m.body, m.created_at, p.display_name from dispute_messages m join profiles p on p.user_id = m.sender_id
                              where m.dispute_case_id = ${d.id} order by m.created_at`
  const names = Object.fromEntries((await sql`select user_id, display_name from profiles where user_id in (${k.client_id}, ${k.contractor_id}, ${k.mediator_id})`).map((p: any) => [p.user_id, p.display_name]))
  const timeline = await sql`select event_type, actor_id, timestamp from audit_log_entries where contract_id = ${k.id} order by timestamp, id`
  const actions = role === 'mediator' ? [] : await sql`
    select a.id, a.action_type, a.params, a.summary, a.status, a.required_signers, a.created_by, a.created_at,
           coalesce((select array_agg(t.user_id) from attestations t where t.subject_type = 'escrow_action' and t.subject_id = a.id), '{}') as signed_by
      from escrow_actions a where a.contract_id = ${k.id} and a.params->>'dispute_id' = ${d.id} order by a.created_at desc`
  const supplierPayments = role === 'client' ? [] : await sql`select amount, signed_at, delivery_status from supplier_payments where contract_id = ${k.id}`
  const settings = await getSettings()
  const noticeHours = Number(settings.advice_notice_hours ?? 48)
  return {
    role, me: user.id, names,
    dispute: d,
    contract: { id: k.id, status: k.status, client_id: k.client_id, contractor_id: k.contractor_id, mediator_id: k.mediator_id, currency: k.currency,
                title: k.snapshot.job.title, terms: role === 'client' || role === 'contractor' || d.mediator_activated_at ? k.snapshot.terms : null,
                quote: k.snapshot.quote },
    request: request ?? null, milestone: milestone ?? null, information: info,
    messages, timeline, actions, supplier_payments: supplierPayments,
    advice_possible_from: d.advice_notice_at ? new Date(new Date(d.advice_notice_at).getTime() + noticeHours * 3_600_000).toISOString() : null,
  }
})
