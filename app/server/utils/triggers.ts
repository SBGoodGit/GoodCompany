// Mediator triggers (b) silence and (c) payment deadline (§4.3, D17). A system check opens a
// DisputeCase with opened_by = system, activates the Mediator at detection and notifies the Mediator
// and both parties; the waiting party is offered `escalate`. It never pays out (L4).
// Idempotent: anything already handled no longer matches the conditions, so re-running is safe,
// and a late run still catches every passed deadline.
// Triggers apply to the final delivery, repair requests and open disputes only (O24).

export async function runTriggerChecks(now = new Date()) {
  const sql = db()
  const settings = await getSettings()
  const silenceMs = Number(settings.silence_days ?? 14) * 86_400_000
  const out = { disputes_opened: 0, mediators_activated: 0 }

  const requests = await sql`
    select r.*, c.client_id, c.contractor_id, c.mediator_id from completion_requests r join contracts c on c.id = r.contract_id
     where r.status = 'open' and (r.is_final or r.repair_agreement_id is not null)
       and not exists (select 1 from dispute_cases d where d.completion_request_id = r.id and d.status in ('between_parties','mediator_active','advice_issued'))`
  for (const r of requests) {
    const silent = new Date(r.last_party_action_at).getTime() + silenceMs <= now.getTime()
    const overdue = r.payment_deadline_at && new Date(r.payment_deadline_at) <= now
    if (!silent && !overdue) continue
    const trigger = silent ? 'silence' : 'payment_deadline'
    await sql.begin(async (tx) => {
      const res = await ledgerFor(tx).submit(r.contract_id, { type: 'system_open_dispute', params: { completion_request_id: r.id, trigger }, actor: null }, [], null)
      const d = res.state.disputes[res.state.disputes.length - 1]
      await audit(tx, { event_type: `system_trigger_${trigger}`, actor_id: null, contract_id: r.contract_id, payload: { dispute_id: d.id, completion_request_id: r.id } })
      const waiting = trigger === 'payment_deadline' ? r.contractor_id : r.awaiting_party === 'client' ? r.contractor_id : r.client_id
      await informActivation(tx, r, d.id, trigger, waiting)
    })
    out.disputes_opened++
  }

  const disputes = await sql`
    select d.*, r.payment_deadline_at, r.awaiting_party, c.client_id, c.contractor_id, c.mediator_id
      from dispute_cases d join contracts c on c.id = d.contract_id left join completion_requests r on r.id = d.completion_request_id
     where d.status = 'between_parties'`
  for (const d of disputes) {
    const silent = new Date(d.last_party_activity_at).getTime() + silenceMs <= now.getTime()
    const overdue = d.payment_deadline_at && new Date(d.payment_deadline_at) <= now
    if (!silent && !overdue) continue
    await sql.begin(async (tx) => {
      await ledgerFor(tx).submit(d.contract_id, { type: 'system_activate_mediator', params: { dispute_id: d.id }, actor: null }, [], null)
      const trigger = overdue ? 'payment_deadline' : 'silence'
      await audit(tx, { event_type: `system_trigger_${trigger}`, actor_id: null, contract_id: d.contract_id, payload: { dispute_id: d.id } })
      await informActivation(tx, d, d.id, trigger, null)
    })
    out.mediators_activated++
  }
  return out
}

async function informActivation(tx: Tx, k: any, disputeId: string, trigger: string, waiting: string | null) {
  const why = trigger === 'silence' ? 'a party has not responded for 14 days' : 'a completion request is still unpaid 30 days after it was made'
  await notify(tx, { user_id: k.mediator_id, type: 'mediator_case', title: 'A case was assigned to you', body: `Activated automatically: ${why}.`, link: `/mediator/cases/${disputeId}`, dedupe_key: `activated:${disputeId}` })
  for (const uid of [k.client_id, k.contractor_id]) {
    await notify(tx, {
      user_id: uid, type: 'mediator_activated', title: 'The Mediator has been activated',
      body: `Activated automatically because ${why}. The 30-day mediator period starts now.${uid === waiting ? ' You can confirm the escalation.' : ''}`,
      link: `/disputes/${disputeId}`, dedupe_key: `activated:${disputeId}`,
    })
  }
}
