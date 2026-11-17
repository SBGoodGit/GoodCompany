// Admin creates simulated demonstration balance for a user (§2.2). Not real money.
import { toMinor } from '../../../shared/money'

export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, { roles: ['admin'] })
  const b = await readBody<{ email?: string; amount?: string | number }>(event)
  let amount = 0
  try { amount = toMinor(String(b.amount ?? '')) } catch { bad('Enter a valid amount') }
  return db().begin(async (tx) => {
    const [u] = await tx`select id from users where email = ${String(b.email ?? '').trim().toLowerCase()}`
    if (!u) bad('No account with that email', 404)
    const balance = await ledgerCall(() => ledgerFor(tx).creditSimulatedBalance(u.id, amount, admin.id))
    await audit(tx, { event_type: 'simulated_balance_credited', actor_id: admin.id, payload: { user_id: u.id, amount } })
    return { balance }
  })
})
