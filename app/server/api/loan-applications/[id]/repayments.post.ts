// Early and partial repayments at any time, without penalty; remaining interest falls pro rata (§3.6, §5.7).
import { toMinor } from '../../../../shared/money'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { amount } = await readBody<{ amount?: string | number }>(event)
  let minor = 0
  try { minor = toMinor(String(amount ?? '')) } catch { bad('Enter a valid amount') }
  if (minor <= 0) bad('Enter the amount')
  return db().begin((tx) => ledgerCall(() => repayLoan(tx, getRouterParam(event, 'id')!, user.id, minor)))
})
