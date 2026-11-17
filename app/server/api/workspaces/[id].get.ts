// Everything the workspace screen needs. The job budget is never included (§3.3).
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
  const quotes = await sql`select * from quotes where workspace_id = ${ws.id} order by created_at desc`
  const preview = ws.stage === 'contract_preview' || ws.outcome === 'accepted' ? await buildContractPreview(sql, ws) : null
  const signatures = preview
    ? await sql`select user_id, created_at from attestations
                 where subject_type = 'contract_signature' and subject_id = ${ws.id} and payload_hash = ${preview.hash}`
    : []
  const [contract] = await sql`select id, status from contracts where workspace_id = ${ws.id}`
  const settings = await getSettings()
  let candidates = null
  if (party === 'client') {
    const [{ count }] = await sql`select count(*)::int as count from negotiation_workspaces where job_id = ${ws.job_id} and reached_beyond_introduction`
    const [{ indicative_budget }] = await sql`select indicative_budget from jobs where id = ${ws.job_id}`
    const rule = settings.multi_candidate_threshold
    candidates = {
      count,
      required: rule.candidates,
      applies: indicative_budget !== null && indicative_budget >= rule.amount,
    }
  }
  const [defaultMediator] = settings.default_mediator_id
    ? await sql`select u.id, p.display_name from users u join profiles p on p.user_id = u.id where u.id = ${settings.default_mediator_id} and u.role = 'mediator'`
    : []
  const mediatorId = ws.mediator_id ?? defaultMediator?.id ?? null
  const [mediator] = mediatorId ? await sql`select user_id as id, display_name from profiles where user_id = ${mediatorId}` : []
  return {
    workspace: ws,
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
