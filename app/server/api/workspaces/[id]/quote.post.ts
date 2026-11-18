// Contractor submits a quote on the accepted terms (round 2, D28 §C): scope of work plus an itemised
// estimate. Every amount follows from the lines (shared/estimate.ts): phase amounts from the non-material
// lines per phase, the materials budget from the material lines, the 2% fee as a separate line on top;
// lines + fee = the contract total the client deposits. The final phase must be at least 10% (D27) when
// a holdback applies; a material-only delivery has none (D29). Own-supply materials count in the final phase.
// Body: { scope_of_work, detail_level: 'sections' | 'lines', sections: [{key,title,kind}],
//         lines: [{section, description, kind, quantity, unit, unit_price (decimal), phase, note}], notes }
import { computeEstimate, type DetailLevel, type EstimateLineInput } from '../../../../shared/estimate'
import { toMinor } from '../../../../shared/money'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<{ scope_of_work?: string; detail_level?: string; sections?: any[]; lines?: any[]; notes?: string }>(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'quote')
    if (party !== 'contractor') bad('Only the contractor submits a quote')
    const [terms] = await tx`select * from terms_versions where workspace_id = ${ws.id} and status = 'accepted' order by version_number desc limit 1`
    if (!terms) bad('No accepted terms version')
    const scope = String(b.scope_of_work ?? '').trim()
    if (!scope) bad('Describe the scope of work: what is delivered and what is excluded')
    const detail: DetailLevel = b.detail_level === 'lines' ? 'lines' : 'sections'
    const sections = (b.sections ?? []).map((s: any, i: number) => ({ key: String(s.key ?? `s${i + 1}`), title: String(s.title ?? '').trim(), kind: s.kind ?? 'general' }))
    let lines: EstimateLineInput[]
    try {
      lines = (b.lines ?? []).map((l: any, i: number) => {
        let unitPrice: number
        try { unitPrice = typeof l.unit_price === 'number' ? l.unit_price : toMinor(String(l.unit_price ?? '')) } catch { throw new Error(`Line ${i + 1}: enter the unit price as an amount`) }
        return {
          section: String(l.section ?? ''), description: String(l.description ?? '').trim(), kind: l.kind,
          quantity: Number(l.quantity), unit: String(l.unit ?? '').trim(), unit_price: unitPrice,
          phase: Number(l.phase), note: String(l.note ?? '').trim(),
        }
      })
    } catch (e) { bad((e as Error).message) }
    const phases = [...terms.payment_phases].sort((a: any, c: any) => a.sequence - c.sequence)
    const est = computeEstimate({ sections, lines: lines! }, phases, {
      feePercentage: Number(terms.fee_percentage), holdbackPercentage: Number(terms.holdback_percentage),
    })
    if (est.errors.length) throw createError({ statusCode: 400, statusMessage: est.errors[0], data: { errors: est.errors } })
    const settings = await getSettings(tx)
    await tx`update quotes set status = 'withdrawn' where workspace_id = ${ws.id} and status = 'submitted'`
    const estimate = {
      sections, lines: est.lines, materials_percentage: est.materials_percentage, fee_percentage: est.fee_percentage, section_totals: est.section_totals,
      own_supply_amount: est.own_supply_amount, holdback_applies: est.holdback_applies, holdback_percentage: est.holdback_percentage,
    }
    const [quote] = await tx`
      insert into quotes (workspace_id, terms_version_id, total_amount, currency, materials_amount, phase_amounts,
                          materials_budget_amount, fee_amount, notes, created_by, scope_of_work, detail_level, estimate)
      values (${ws.id}, ${terms.id}, ${est.total_amount}, ${settings.mvp1_contract_currency}, ${est.materials_budget_amount},
              ${tx.json(est.phase_amounts as never)}, ${est.materials_budget_amount}, ${est.fee_amount},
              ${String(b.notes ?? '')}, ${user.id}, ${scope}, ${detail}, ${tx.json(estimate as never)})
      returning *`
    await touch(tx, ws.id)
    await audit(tx, { event_type: 'quote_submitted', actor_id: user.id, workspace_id: ws.id, payload: { quote_id: quote.id, total_amount: est.total_amount, lines: est.lines.length } })
    await notify(tx, { user_id: ws.client_id, type: 'quote_submitted', title: 'You received a quote', link: `/workspaces/${ws.id}` })
    return quote
  })
})
