// Everything the workspace screen needs. The job's indicative budget is never included (§3.3); the
// budget range the client gives in this workspace's intake is (D28 §B3). The client's private note
// is returned to the client only (D28 §F3). The client sees each estimate at the detail level the
// contractor chose; the contractor sees all lines (D28 §C7).
import { estimateView, type DetailLevel } from '../../../shared/estimate'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const sql = db()
  const { ws, party } = await loadWorkspace(sql, getRouterParam(event, 'id')!, user.id)
  const [job] = await sql`select id, title, description, category, region, urgency, status, selected_contractor_id from jobs where id = ${ws.job_id}`
  const people = await sql`select user_id, display_name from profiles where user_id in (${ws.client_id}, ${ws.contractor_id})`
  const names = Object.fromEntries(people.map((p: any) => [p.user_id, p.display_name]))
  const messages = await sql`select id, sender_id, body, created_at from messages where workspace_id = ${ws.id} order by created_at`
  const intake = await sql`select * from technical_intake_answers where workspace_id = ${ws.id} order by created_at, question_key`
  const terms = await sql`
    select t.*, p.display_name as mediator_name from terms_versions t join profiles p on p.user_id = t.mediator_id
     where t.workspace_id = ${ws.id} order by t.version_number desc`
  const quoteRows = await sql`select * from quotes where workspace_id = ${ws.id} order by created_at desc`
  const quotes = quoteRows.map((q: any) => ({
    ...q,
    estimate: q.estimate && party === 'client'
      ? { ...estimateView(q.estimate.sections, q.estimate.lines, q.detail_level as DetailLevel), materials_percentage: q.estimate.materials_percentage, fee_percentage: q.estimate.fee_percentage }
      : q.estimate,
  }))
  const preview = ws.stage === 'contract_preview' || ws.outcome === 'accepted' ? await buildContractPreview(sql, ws) : null
  const signatures = preview
    ? await sql`select user_id, created_at from attestations
                 where subject_type = 'contract_signature' and subject_id = ${ws.id} and payload_hash = ${preview.hash}`
    : []
  const [contract] = await sql`select id, status from contracts where workspace_id = ${ws.id}`
  const settings = await getSettings()
  // Client tools (D28 §E, §F): candidate limits and quick switching between the job's conversations.
  let candidates = null
  if (party === 'client' && !ws.parent_contract_id) {
    const others = await sql`
      select w.id, w.stage, w.outcome, w.last_activity_at, p.display_name as contractor_name
        from negotiation_workspaces w join profiles p on p.user_id = w.contractor_id
       where w.job_id = ${ws.job_id} and w.parent_contract_id is null order by w.created_at`
    candidates = { ...(await candidateSlots(sql, ws.job_id)), workspaces: others }
  }
  const { client_note: _note, closed_by: _cb, ...shared } = ws
  const workspace = party === 'client' ? ws : shared
  const [defaultMediator] = settings.default_mediator_id
    ? await sql`select u.id, p.display_name from users u join profiles p on p.user_id = u.id where u.id = ${settings.default_mediator_id} and u.role = 'mediator'`
    : []
  const mediatorId = ws.mediator_id ?? defaultMediator?.id ?? null
  const [mediator] = mediatorId ? await sql`select user_id as id, display_name from profiles where user_id = ${mediatorId}` : []
  return {
    workspace,
    my_party: party,
    me: user.id,
    names,
    job,
    messages,
    intake,
    terms_versions: terms,
    quotes,
    preview: preview ? { snapshot: preview.snapshot, hash: preview.hash } : null,
    signatures,
    contract: contract ?? null,
    candidates,
    mediator: mediator ?? null,
    rules: {
      fee_percentage: Number(settings.platform_fee_rate),
      warranty_options: settings.warranty_period_options,
      warranty_default: settings.warranty_period_default,
      holdback_percentage: settings.holdback_percentage,
      currency: settings.mvp1_contract_currency,
    },
  }
})
