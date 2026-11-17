// Admin adds simulated seed money to a reserve (demonstration only; ledger_transactions source 'simulated_seed').
import { toMinor } from '../../../../shared/money'

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, { roles: ['admin'] })
  const { reserve, amount } = await readBody<{ reserve?: string; amount?: string }>(event)
  if (!['safety', 'credit', 'legal', 'innovation'].includes(String(reserve))) bad('Choose a reserve')
  let minor = 0
  try { minor = toMinor(String(amount ?? '')) } catch { bad('Enter a valid amount') }
  return db().begin(async (tx) => {
    await addToReserve(tx, String(reserve), minor, 'simulated_seed')
    await audit(tx, { event_type: 'reserve_seeded', actor_id: admin.id, payload: { reserve, amount: minor } })
    return { ok: true }
  })
})
