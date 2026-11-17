// Test helpers that drive the API directly, so escrow tests start from a signed contract quickly.
// The negotiation itself is covered through the UI in negotiation.spec.ts.
import { createClient } from '@supabase/supabase-js'
import postgres from 'postgres'

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
 * Client posts a job; contractor negotiates terms (§7.1 shape by default: advance 10%, work 28%,
 * final 30%, materials 30%, fee 2%) and a quote; both sign. Returns the contract id.
 */
export async function signedContract(client: Party, contractor: Party, opts: { total?: string; warranty?: number; phases?: any[]; materials?: number } = {}) {
  client.token ??= await tokenFor(client)
  contractor.token ??= await tokenFor(contractor)
  const job = await call(client.token, 'POST', '/api/jobs', { title: `Escrow test job ${Date.now()}`, category: 'carpentry', region: 'Utrecht', description: 'Test' })
  const ws = await call(contractor.token, 'POST', `/api/jobs/${job.id}/responses`, { message: 'Hello' })
  await call(contractor.token, 'POST', `/api/workspaces/${ws.id}/advance`)
  await call(client.token, 'POST', `/api/workspaces/${ws.id}/intake`, { answers: { scope: 'Cabinets', location_access: 'Ground floor' } })
  await call(client.token, 'POST', `/api/workspaces/${ws.id}/advance`)
  const v = await call(contractor.token, 'POST', `/api/workspaces/${ws.id}/terms-versions`, {
    warranty_period_days: opts.warranty ?? 30, execution_period_days: 60, materials_budget_percentage: opts.materials ?? 30,
    payment_phases: opts.phases ?? [
      { kind: 'advance', percentage: 10, description: 'Advance', evidence_required: '' },
      { kind: 'work', percentage: 28, description: 'Carcasses installed', evidence_required: 'Photos' },
      { kind: 'final', percentage: 30, description: 'Delivery', evidence_required: 'Photos and walkthrough' },
    ],
  })
  await call(client.token, 'POST', `/api/workspaces/${ws.id}/terms-versions/${v.id}/accept`)
  await call(contractor.token, 'POST', `/api/workspaces/${ws.id}/quote`, { total_amount: opts.total ?? '10000', materials_amount: '2500' })
  await call(client.token, 'POST', `/api/workspaces/${ws.id}/quote/accept`)
  const view = await call(client.token, 'GET', `/api/workspaces/${ws.id}`)
  for (const u of [contractor, client]) {
    const st = await stepUpToken(u.token!, u.password)
    const r = await call(u.token!, 'POST', `/api/workspaces/${ws.id}/sign`, { snapshot_hash: view.preview.hash }, { 'x-step-up-token': st })
    if (r.contract_id) return r.contract_id as string
  }
  throw new Error('Contract was not created')
}
