// System jobs (§10). Every job is idempotent and safe to re-run; a missed or late run never skips a
// deadline, because each job selects everything whose moment has passed. Jobs open cases and send
// notifications; none of them pays out (L4). Each run is logged in job_runs.

type JobFn = (now: Date) => Promise<unknown>

export const JOBS: Record<string, { label: string; intervalMinutes: (s: Record<string, any>) => number; run: JobFn }> = {
  triggers: { label: 'Response window, silence and payment deadline check', intervalMinutes: () => 60, run: (now) => runTriggerChecks(now) },
  mediator_due: { label: 'Mediator due-date check', intervalMinutes: () => 1440, run: (now) => mediatorDueCheck(now) },
  change_order_expiry: { label: 'Change Order expiry', intervalMinutes: () => 60, run: (now) => changeOrderExpiry(now) },
  action_expiry: { label: 'Escrow action signature expiry', intervalMinutes: () => 60, run: (now) => actionExpiry(now) },
  workspace_inactivity: { label: 'Workspace inactivity', intervalMinutes: () => 1440, run: (now) => workspaceInactivity(now) },
  fee_aggregation: { label: 'Fee aggregation', intervalMinutes: (s) => Number(s.fee_batch_interval_minutes ?? 60), run: () => runFeeAggregation() },
  vote_resolution: { label: 'Vote resolution', intervalMinutes: () => 60, run: (now) => runVoteResolution(now) },
  contact_reconciliation: { label: 'Contact reconciliation', intervalMinutes: () => 1440, run: () => contactReconciliation() },
  health_score: { label: 'Community Health Score', intervalMinutes: () => 1440, run: () => runHealthScore() },
}

export async function runJob(name: string, now = new Date()) {
  const job = JOBS[name]
  if (!job) bad('Unknown job', 404)
  const [run] = await db()`insert into job_runs (job) values (${name}) returning id`
  try {
    const result = await job.run(now)
    await db()`update job_runs set finished_at = now(), result = ${db().json((result ?? {}) as never)} where id = ${run.id}`
    return { job: name, result }
  } catch (e) {
    await db()`update job_runs set finished_at = now(), error = ${(e as Error).message} where id = ${run.id}`
    return { job: name, error: (e as Error).message }
  }
}

/** Scheduler tick: run every job whose interval has passed since its last run. */
export async function schedulerTick(now = new Date()) {
  const settings = await getSettings()
  const last = await db()`select job, max(started_at) as at from job_runs group by job`
  const lastAt = Object.fromEntries(last.map((r: any) => [r.job, new Date(r.at).getTime()]))
  const ran: string[] = []
  for (const [name, job] of Object.entries(JOBS)) {
    const due = !lastAt[name] || now.getTime() - lastAt[name] >= job.intervalMinutes(settings) * 60_000
    if (due) { await runJob(name, now); ran.push(name) }
  }
  return ran
}

async function mediatorDueCheck(now: Date) {
  const settings = await getSettings()
  const noticeMs = Number(settings.mediator_due_notice_days ?? 3) * 86_400_000
  const cases = await db()`
    select d.id, d.mediator_due_at, c.id as contract_id, c.client_id, c.contractor_id, c.mediator_id from dispute_cases d join contracts c on c.id = d.contract_id
     where d.status = 'mediator_active' and d.mediator_due_at is not null and d.mediator_due_at <= ${new Date(now.getTime() + noticeMs)}`
  let sent = 0
  for (const d of cases) {
    const passed = new Date(d.mediator_due_at) <= now
    const day = new Date(d.mediator_due_at).toISOString().slice(0, 10)
    const key = `${passed ? 'due' : 'due-soon'}:${d.id}:${day}` // a new date after an extension gets its own notices
    await db().begin(async (tx) => {
      for (const uid of [d.mediator_id, d.client_id, d.contractor_id]) {
        await notify(tx, {
          user_id: uid, type: 'mediator_due', dedupe_key: key,
          title: passed ? 'The mediator period has reached its due date' : `The mediator period ends on ${day}`,
          link: uid === d.mediator_id ? `/mediator/cases/${d.id}` : `/disputes/${d.id}`,
        })
      }
    })
    sent++
  }
  return { cases: sent }
}

async function changeOrderExpiry(now: Date) {
  return db().begin(async (tx) => {
    const expired = await tx`update change_orders set status = 'expired' where status = 'proposed' and expires_at <= ${now}
                             returning id, contract_id, requested_by, escrow_action_id`
    for (const co of expired) {
      if (co.escrow_action_id) await tx`update escrow_actions set status = 'expired' where id = ${co.escrow_action_id} and status = 'awaiting_signatures'`
      await audit(tx, { event_type: 'change_order_expired', actor_id: null, contract_id: co.contract_id, payload: { change_order_id: co.id } })
      await notify(tx, { user_id: co.requested_by, type: 'change_order', title: 'Your Change Order expired without an answer', body: 'The original contract is unchanged.', link: `/contracts/${co.contract_id}`, dedupe_key: `co-expired:${co.id}` })
    }
    return { expired: expired.length }
  })
}

async function actionExpiry(now: Date) {
  const rows = await db()`update escrow_actions set status = 'expired' where status = 'awaiting_signatures' and expires_at <= ${now} returning id`
  return { expired: rows.length }
}

/** Notice at day 18, expiry at day 21 (§7.9, §9.1). */
async function workspaceInactivity(now: Date) {
  const settings = await getSettings()
  const timeout = Number(settings.workspace_inactivity_timeout_days ?? 21)
  const notice = Number(settings.workspace_inactivity_notice_days ?? 3)
  return db().begin(async (tx) => {
    const expired = await tx`
      update negotiation_workspaces set stage = 'closed', outcome = 'expired', closed_at = ${now}
       where stage <> 'closed' and last_activity_at <= ${new Date(now.getTime() - timeout * 86_400_000)}
      returning id, client_id, contractor_id`
    for (const w of expired) {
      await audit(tx, { event_type: 'workspace_expired', actor_id: null, workspace_id: w.id })
      for (const uid of [w.client_id, w.contractor_id]) await notify(tx, { user_id: uid, type: 'workspace_expired', title: 'A workspace expired after 21 days without activity', link: `/workspaces/${w.id}`, dedupe_key: `ws-expired:${w.id}` })
    }
    const warn = await tx`
      update negotiation_workspaces set inactivity_notice_sent_at = ${now}
       where stage <> 'closed' and inactivity_notice_sent_at is null and last_activity_at <= ${new Date(now.getTime() - (timeout - notice) * 86_400_000)}
      returning id, client_id, contractor_id, last_activity_at`
    for (const w of warn) {
      for (const uid of [w.client_id, w.contractor_id]) {
        await notify(tx, { user_id: uid, type: 'workspace_inactive', title: `A workspace will expire in ${notice} days without activity`, link: `/workspaces/${w.id}`, dedupe_key: `ws-notice:${w.id}:${new Date(w.last_activity_at).toISOString()}` })
      }
    }
    return { expired: expired.length, noticed: warn.length }
  })
}

async function contactReconciliation() {
  const rows = await db()`
    update contacts c set linked_user_id = u.id, status = 'linked'
      from users u
     where c.status = 'unlinked' and u.status = 'active' and u.id <> c.owner_id
       and ((c.email is not null and lower(c.email) = u.email) or (c.phone is not null and c.phone = u.phone))
    returning c.id`
  return { linked: rows.length }
}
