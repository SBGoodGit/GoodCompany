import { holdbackOf, mandatoryClauses } from '../../shared/terms'
import { estimateView, type DetailLevel } from '../../shared/estimate'

export type Party = 'client' | 'contractor'

/** Load a workspace the user is a party to. Optionally lock it for the rest of the transaction. */
export async function loadWorkspace(tx: Tx, id: string, userId: string, opts: { lock?: boolean } = {}) {
  const rows = opts.lock
    ? await tx`select * from negotiation_workspaces where id = ${id} for update`
    : await tx`select * from negotiation_workspaces where id = ${id}`
  const ws = rows[0]
  if (!ws) bad('Workspace not found', 404)
  const party: Party | null = ws.client_id === userId ? 'client' : ws.contractor_id === userId ? 'contractor' : null
  if (!party) bad('Workspace not found', 404)
  return { ws, party: party as Party }
}

export function requireOpen(ws: any) {
  if (ws.stage === 'closed') bad('This workspace is closed')
}

export function requireStage(ws: any, ...stages: string[]) {
  requireOpen(ws)
  if (!stages.includes(ws.stage)) bad(`This step is not possible in the ${ws.stage.replace('_', ' ')} stage`)
}

export async function touch(tx: Tx, wsId: string, patch: Record<string, unknown> = {}) {
  await tx`update negotiation_workspaces set ${tx({ ...patch, last_activity_at: new Date(), inactivity_notice_sent_at: null } as never)} where id = ${wsId}`
}

/**
 * Candidate limits per job (round 2, D28 §E). Introductions are unlimited. Past the introduction at
 * most `max_candidates_in_negotiation` candidates at a time: open workspaces in the technical intake or
 * terms, plus every workspace that ever reached the quote stage (no swapping after that, so at most that
 * many quotes). The client may close a candidate in the intake or terms and move another in at most
 * `max_candidate_swaps` times. Linked contracts for extra work (parent_contract_id) do not count.
 */
export async function candidateSlots(tx: Tx, jobId: string) {
  const settings = await getSettings(tx)
  const [row] = await tx`
    select count(*) filter (where (stage in ('technical_intake', 'terms') and outcome = 'pending') or reached_quote_at is not null)::int as active,
           count(*) filter (where closed_by = client_id and closed_from_stage in ('technical_intake', 'terms'))::int as swaps_used
      from negotiation_workspaces where job_id = ${jobId} and parent_contract_id is null`
  const limit = Number(settings.max_candidates_in_negotiation ?? 3)
  const swapsMax = Number(settings.max_candidate_swaps ?? 2)
  return { active: row.active as number, limit, swaps_used: row.swaps_used as number, swaps_max: swapsMax }
}

/** Refuse moving another candidate past the introduction when a limit is reached (clear message). */
export function assertCanMoveIn(slots: Awaited<ReturnType<typeof candidateSlots>>) {
  if (slots.swaps_used > slots.swaps_max) {
    bad(`You have used all ${slots.swaps_max} candidate swaps for this job, so no further candidate can move past the introduction. Introductions stay possible.`, 409)
  }
  if (slots.active >= slots.limit) {
    bad(`This job already has ${slots.limit} candidates past the introduction (technical intake, terms or quote). Close a candidate in the technical intake or terms first; you have ${Math.max(0, slots.swaps_max - slots.swaps_used)} swap(s) left. Introductions stay possible.`, 409)
  }
}

/** Mark a workspace closed, remembering who closed it from which stage (for the swap count). */
export async function closeWorkspace(tx: Tx, ws: any, outcome: string, userId: string | null) {
  await tx`update negotiation_workspaces set stage = 'closed', outcome = ${outcome}, closed_at = now(), last_activity_at = now(),
             closed_by = ${userId}, closed_from_stage = ${ws.stage} where id = ${ws.id}`
}

export function otherParty(ws: any, party: Party): string {
  return party === 'client' ? ws.contractor_id : ws.client_id
}

/**
 * The frozen contract snapshot (§3.5): accepted terms + accepted quote + the milestones and
 * holdback they produce. Deterministic, so both parties sign exactly the same hash.
 */
export async function buildContractPreview(tx: Tx, ws: any) {
  const [terms] = await tx`select * from terms_versions where workspace_id = ${ws.id} and status = 'accepted' order by version_number desc limit 1`
  const [quote] = terms
    ? await tx`select * from quotes where workspace_id = ${ws.id} and terms_version_id = ${terms.id} and status = 'accepted' order by created_at desc limit 1`
    : []
  if (!terms || !quote) return null
  const [job] = await tx`select id, title, description, category, region from jobs where id = ${ws.job_id}`
  const [mediator] = await tx`select u.id, p.display_name from users u join profiles p on p.user_id = u.id where u.id = ${terms.mediator_id}`
  const phases = [...terms.payment_phases].sort((a: any, b: any) => a.sequence - b.sequence)
  const amountBySeq = new Map<number, number>(quote.phase_amounts.map((p: any) => [p.sequence, p.amount]))
  const pctBySeq = new Map<number, number | null>(quote.phase_amounts.map((p: any) => [p.sequence, p.percentage ?? null]))
  // D29: a material-only delivery (no work, subcontracted work or equipment lines) has no holdback.
  const holdbackPct = quote.estimate?.holdback_applies === false ? 0 : terms.holdback_percentage
  const holdback = holdbackOf(quote.total_amount, holdbackPct)
  const clauses = holdbackPct > 0 ? terms.mandatory_clauses : terms.mandatory_clauses.map((c: any) => c.key !== 'holdback_reservation' ? c : {
    ...c, text: 'This is a material-only delivery: no holdback applies (D29). The full amount stays in escrow until the client approves the delivery.',
  })
  const snapshot = {
    format: 'goodcompany-contract-v1',
    workspace_id: ws.id,
    parent_contract_id: ws.parent_contract_id ?? null,
    job: { id: job.id, title: job.title, description: job.description, category: job.category, region: job.region },
    client_id: ws.client_id,
    contractor_id: ws.contractor_id,
    mediator: { id: mediator.id, display_name: mediator.display_name },
    terms: {
      id: terms.id,
      version_number: terms.version_number,
      working_hours: terms.working_hours,
      communication_channel: terms.communication_channel,
      ownership_terms: terms.ownership_terms,
      cancellation_terms: terms.cancellation_terms,
      warranty_period_days: terms.warranty_period_days,
      holdback_percentage: holdbackPct,
      execution_period_days: terms.execution_period_days,
      materials_budget_percentage: quote.estimate ? quote.estimate.materials_percentage ?? null : terms.materials_budget_percentage,
      fee_percentage: terms.fee_percentage,
      payment_phases: phases.map((p: any) => ({ ...p, percentage: pctBySeq.get(p.sequence) ?? p.percentage ?? null })),
      mandatory_clauses: clauses,
    },
    quote: {
      id: quote.id,
      currency: quote.currency,
      total_amount: quote.total_amount,
      materials_amount: quote.materials_amount,
      materials_budget_amount: quote.materials_budget_amount,
      fee_amount: quote.fee_amount,
      phase_amounts: quote.phase_amounts,
      scope_of_work: quote.scope_of_work ?? '',
      // The itemised estimate at the detail level the contractor chose (what the client sees).
      estimate: quote.estimate ? estimateView(quote.estimate.sections, quote.estimate.lines, quote.detail_level as DetailLevel) : null,
    },
    milestones: phases.map((p: any) => ({
      sequence: p.sequence,
      kind: p.kind,
      description: p.description,
      evidence_required: p.evidence_required ?? '',
      amount: amountBySeq.get(p.sequence) ?? 0,
    })),
    holdback_amount: holdback,
    holdback_notice: holdbackPct === 0
      ? 'Material-only delivery: there is no holdback. The amount stays frozen in the escrow until the client approves the delivery.'
      : 'The holdback is a motivation amount, not insurance. If repair costs exceed the remaining holdback, the contractor bears the excess outside the platform, and the contractor never has to top up the escrow.',
  }
  return { snapshot, hash: hashCanonical(snapshot), terms, quote }
}

export function clausesFor(warrantyDays: number, holdbackPct: number) {
  return mandatoryClauses(warrantyDays, holdbackPct)
}
