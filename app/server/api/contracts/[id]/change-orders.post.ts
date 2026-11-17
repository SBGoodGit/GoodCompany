// Propose a Change Order (§4.4). Motivation required. The proposer signs the proposal on sending
// (step-up); it takes effect as one atomic ledger action when the other party signs to accept,
// including any extra deposit. Expires at created_at + min(execution_period_days, 90).
import { toMinor } from '../../../../shared/money'

const signed = (v: unknown) => {
  const s = String(v ?? '').trim()
  if (!s) return 0
  const neg = s.startsWith('-')
  const n = toMinor(neg ? s.slice(1) : s)
  return neg ? -n : n
}

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<Record<string, any>>(event)
  if (!b.description?.trim()) bad('Describe what changes')
  if (!b.motivation?.trim()) bad('A motivation is required')
  return db().begin(async (tx) => {
    const { contract } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    if (contract.status !== 'active') bad('Change Orders are possible only while the contract is active')
    let delta = 0, materials: number | null = null
    let changes: { milestone_id: string; amount: number; description?: string }[] = []
    try {
      delta = signed(b.amount_delta)
      if (b.new_materials_budget !== undefined && b.new_materials_budget !== null && String(b.new_materials_budget).trim() !== '') materials = toMinor(String(b.new_materials_budget))
      changes = (b.milestone_changes ?? []).map((c: any) => ({ milestone_id: String(c.milestone_id), amount: toMinor(String(c.amount)), description: c.description || undefined }))
    } catch (e) { bad((e as Error).message) }
    const settings = await getSettings(tx)
    const days = Math.min(Number(contract.snapshot.terms.execution_period_days), Number(settings.change_order_expiry_max_days ?? 90))
    const [co] = await tx`
      insert into change_orders (contract_id, requested_by, description, motivation, amount_delta, milestone_changes, new_materials_budget, expires_at)
      values (${contract.id}, ${user.id}, ${b.description.trim()}, ${b.motivation.trim()}, ${delta},
              ${tx.json(changes as never)}, ${materials}, now() + make_interval(days => ${days}))
      returning *`
    const action = await prepareAction(tx, user.id, contract.id, 'change_order', { change_order_id: co.id })
    await tx`update change_orders set escrow_action_id = ${action.id} where id = ${co.id}`
    const res = await signAction(event, tx, user.id, action.id)
    await audit(tx, { event_type: 'change_order_proposed', actor_id: user.id, contract_id: contract.id, payload: { change_order_id: co.id, amount_delta: delta } })
    return { change_order: co, action: res.action }
  })
})
