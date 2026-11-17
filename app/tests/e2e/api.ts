// Test helpers that drive the API directly, so escrow tests start from a signed contract quickly.
// The negotiation itself is covered through the UI in negotiation.spec.ts.
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'
import { quoteBreakdown } from '../../shared/terms'
import { toMinor } from '../../shared/money'

const base = () => process.env.APP_URL || 'http://127.0.0.1:3100'
export const superuserDb = () => postgres(process.env.DATABASE_URL!, { max: 1 })

export async function tokenFor(u: { email: string; password: string }) {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data, error } = await sb.auth.signInWithPassword(u)
  if (error) throw error
  return data.session!.access_token
}

export async function call<T = any>(token: string, method: string, path: string, body?: unknown, headers: Record<string, string> = {}): Promise<T> {
  const res = await fetch(base() + path, {
    method, headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}`, ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${json.statusMessage ?? json.message ?? ''} ${JSON.stringify(json.data ?? '')}`)
  return json
}

export async function stepUpToken(token: string, password: string) {
  return (await call(token, 'POST', '/api/auth/step-up', { password })).token as string
}

/** Prepare + sign an escrow action as one user (single-signer actions apply immediately). */
export async function escrowAction(u: { token: string; password: string }, contractId: string, type: string, params: Record<string, any> = {}) {
  const action = await call(u.token, 'POST', `/api/contracts/${contractId}/escrow/actions`, { type, params })
  const st = await stepUpToken(u.token, u.password)
  return call(u.token, 'POST', `/api/escrow/actions/${action.id}/sign`, {}, { 'x-step-up-token': st })
}

export async function creditBalance(email: string, amount: string) {
  const admin = await tokenFor({ email: process.env.SEED_ADMIN_EMAIL!, password: process.env.SEED_ADMIN_PASSWORD! })
  return call(admin, 'POST', '/api/admin/simulated-balances', { email, amount })
}

type Party = { email: string; password: string; token?: string }

/**
 * An itemised quote (round 2) that reproduces a split given in percentages: one labour line per
 * phase and one material line for the materials budget, so the escrow tests keep their numbers.
 */
export function estimateFor(total: string, phases: { kind: string; percentage: number; description: string }[], materialsPct: number) {
  const b = quoteBreakdown(toMinor(total), { payment_phases: phases.map((p, i) => ({ ...p, sequence: i + 1, kind: p.kind as any, evidence_required: '' })), materials_budget_percentage: materialsPct }, 2)
  const lines = b.phase_amounts.map((p) => ({ section: 'work', description: phases[p.sequence - 1].description, kind: 'labour', quantity: 1, unit: 'lump sum', unit_price: p.amount, phase: p.sequence }))
  if (b.materials_budget_amount > 0) lines.push({ section: 'work', description: 'Materials', kind: 'material', quantity: 1, unit: 'lump sum', unit_price: b.materials_budget_amount, phase: phases.length })
  return { scope_of_work: 'As agreed in the intake.', detail_level: 'sections', sections: [{ key: 'work', title: 'Work' }], lines }
}

/** Round 2 negotiation up to an open quote stage: move in, intake with budget, contractor's terms accepted. */
export async function toQuoteStage(client: Party, contractor: Party, jobId: string, terms: Record<string, any>) {
  const ws = await call(contractor.token!, 'POST', `/api/jobs/${jobId}/responses`, { message: 'Hello' })
  await call(client.token!, 'POST', `/api/workspaces/${ws.id}/advance`)
  await call(client.token!, 'POST', `/api/workspaces/${ws.id}/intake`, { answers: { scope: 'Cabinets', location_access: 'Ground floor' }, budget_min: '5000', budget_max: '15000' })
  await call(client.token!, 'POST', `/api/workspaces/${ws.id}/advance`)
  const v = await call(contractor.token!, 'POST', `/api/workspaces/${ws.id}/terms-versions`, terms)
  await call(client.token!, 'POST', `/api/workspaces/${ws.id}/terms-versions/${v.id}/accept`)
  return ws
}

/**
 * Client posts a job; contractor negotiates terms (§7.1 shape by default: advance 10%, work 28%,
 * final 30%, materials 30%, fee 2%) and an itemised quote; both sign. Returns the contract id.
 */
export async function signedContract(client: Party, contractor: Party, opts: { total?: string; warranty?: number; phases?: any[]; materials?: number } = {}) {
  client.token ??= await tokenFor(client)
  contractor.token ??= await tokenFor(contractor)
  const job = await call(client.token, 'POST', '/api/jobs', { title: `Escrow test job ${Date.now()}`, category: 'carpentry', region: 'Utrecht', description: 'Test' })
  const phases = opts.phases ?? [
    { kind: 'advance', percentage: 10, description: 'Advance', evidence_required: '' },
    { kind: 'work', percentage: 28, description: 'Carcasses installed', evidence_required: 'Photos' },
    { kind: 'final', percentage: 30, description: 'Delivery', evidence_required: 'Photos and walkthrough' },
  ]
  const ws = await toQuoteStage(client, contractor, job.id, {
    warranty_period_days: opts.warranty ?? 30, execution_period_days: 60,
    payment_phases: phases.map(({ percentage: _p, ...rest }: any) => rest),
  })
  await call(contractor.token, 'POST', `/api/workspaces/${ws.id}/quote`, estimateFor(opts.total ?? '10000', phases, opts.materials ?? 30))
  await call(client.token, 'POST', `/api/workspaces/${ws.id}/quote/accept`)
  const view = await call(client.token, 'GET', `/api/workspaces/${ws.id}`)
  for (const u of [contractor, client]) {
    const st = await stepUpToken(u.token!, u.password)
    const r = await call(u.token!, 'POST', `/api/workspaces/${ws.id}/sign`, { snapshot_hash: view.preview.hash }, { 'x-step-up-token': st })
    if (r.contract_id) return r.contract_id as string
  }
  throw new Error('Contract was not created')
}
