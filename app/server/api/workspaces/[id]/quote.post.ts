// Contractor submits a quote on the accepted terms (§3.4). The full contract amount is what the
// client will deposit; phases, materials budget and the 2% fee are derived with largest-remainder rounding.
import { quoteBreakdown } from '../../../../shared/terms'
import { toMinor } from '../../../../shared/money'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<{ total_amount?: string | number; materials_amount?: string | number | null; notes?: string }>(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'quote')
    if (party !== 'contractor') bad('Only the contractor submits a quote')
    const [terms] = await tx`select * from terms_versions where workspace_id = ${ws.id} and status = 'accepted' order by version_number desc limit 1`
    if (!terms) bad('No accepted terms version')
    let total: number, materials: number | null = null
    try {
      total = toMinor(String(b.total_amount ?? ''))
      if (b.materials_amount !== undefined && b.materials_amount !== null && String(b.materials_amount).trim() !== '') materials = toMinor(String(b.materials_amount))
    } catch (e) { bad((e as Error).message) }
    if (total! <= 0) bad('The total amount must be greater than 0')
    if (materials !== null && materials > total!) bad('The materials amount cannot exceed the total amount')
    const breakdown = quoteBreakdown(total!, terms, Number(terms.fee_percentage))
    const settings = await getSettings(tx)
    await tx`update quotes set status = 'withdrawn' where workspace_id = ${ws.id} and status = 'submitted'`
    const [quote] = await tx`
      insert into quotes (workspace_id, terms_version_id, total_amount, currency, materials_amount, phase_amounts,
                          materials_budget_amount, fee_amount, notes, created_by)
      values (${ws.id}, ${terms.id}, ${total!}, ${settings.mvp1_contract_currency}, ${materials},
              ${tx.json(breakdown.phase_amounts as never)}, ${breakdown.materials_budget_amount}, ${breakdown.fee_amount},
              ${b.notes ?? ''}, ${user.id})
      returning *`
    await touch(tx, ws.id)
    await audit(tx, { event_type: 'quote_submitted', actor_id: user.id, workspace_id: ws.id, payload: { quote_id: quote.id, total_amount: total! } })
    await notify(tx, { user_id: ws.client_id, type: 'quote_submitted', title: 'You received a quote', link: `/workspaces/${ws.id}` })
    return quote
  })
})
