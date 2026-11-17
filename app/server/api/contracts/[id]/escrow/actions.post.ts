// Prepare an escrow action (§5.4). Returns its id, hash, required signers and a readable summary.
// Nothing changes in the ledger until all required parties have signed.
import { toMinor } from '../../../../../shared/money'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const b = await readBody<{ type?: string; params?: Record<string, any> }>(event)
  const params = { ...(b.params ?? {}) }
  return db().begin(async (tx) => {
    await loadContractForParty(tx, id, user.id)
    // Amounts arrive as decimals from the UI; the ledger works in minor units and recomputes everything.
    for (const k of ['amount', 'disputed_amount', 'to_contractor', 'to_client', 'held_amount']) {
      if (params[k] !== undefined && params[k] !== null && typeof params[k] !== 'number') {
        try { params[k] = toMinor(String(params[k])) } catch { bad(`${k.replace('_', ' ')} is not a valid amount`) }
      }
    }
    if (b.type === 'pay_supplier' && params.supplier_email) {
      const [sup] = await tx`select id from users where email = ${String(params.supplier_email).trim().toLowerCase()}`
      if (!sup) bad('No GoodCompany account with that email; a supplier needs a verified account')
      params.supplier_id = sup.id
      delete params.supplier_email
    }
    return prepareAction(tx, user.id, id, String(b.type), params)
  })
})
