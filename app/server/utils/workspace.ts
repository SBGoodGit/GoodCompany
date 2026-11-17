import { holdbackOf, mandatoryClauses } from '../../shared/terms'

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
  const holdback = holdbackOf(quote.total_amount, terms.holdback_percentage)
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
      holdback_percentage: terms.holdback_percentage,
      execution_period_days: terms.execution_period_days,
      materials_budget_percentage: terms.materials_budget_percentage,
      fee_percentage: terms.fee_percentage,
      payment_phases: phases,
      mandatory_clauses: terms.mandatory_clauses,
    },
    quote: {
      id: quote.id,
      currency: quote.currency,
      total_amount: quote.total_amount,
      materials_amount: quote.materials_amount,
      materials_budget_amount: quote.materials_budget_amount,
      fee_amount: quote.fee_amount,
      phase_amounts: quote.phase_amounts,
    },
    milestones: phases.map((p: any) => ({
      sequence: p.sequence,
      kind: p.kind,
      description: p.description,
      evidence_required: p.evidence_required ?? '',
      amount: amountBySeq.get(p.sequence) ?? 0,
    })),
    holdback_amount: holdback,
    holdback_notice:
      'The holdback is a motivation amount, not insurance. If repair costs exceed the remaining holdback, the contractor bears the excess outside the platform, and the contractor never has to top up the escrow.',
  }
  return { snapshot, hash: hashCanonical(snapshot), terms, quote }
}

export function clausesFor(warrantyDays: number, holdbackPct: number) {
  return mandatoryClauses(warrantyDays, holdbackPct)
}
