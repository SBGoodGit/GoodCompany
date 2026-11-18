// Propose a terms version (§3.4, §5.3). Round 2 (D28 §A1): only the contractor proposes terms,
// including the payment phase structure; amounts and percentages follow from the itemised estimate.
// Earlier open proposals are superseded. The mediator is the one assigned by an admin (P15).
import { validateTerms, type TermsInput } from '../../../../shared/terms'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<TermsInput>(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'terms')
    if (party !== 'contractor') bad('Only the contractor proposes terms. You can accept them, reject them or ask for a revision.')
    const settings = await getSettings(tx)
    const rules = {
      feePercentage: Number(settings.platform_fee_rate),
      warrantyOptions: settings.warranty_period_options as number[],
      holdbackPercentage: Number(settings.holdback_percentage),
    }
    const input: TermsInput = {
      ...b,
      warranty_period_days: Number(b.warranty_period_days),
      execution_period_days: Number(b.execution_period_days),
      materials_budget_percentage: null, // derived from the estimate's material lines
      payment_phases: (b.payment_phases ?? []).map((p, i) => ({
        sequence: i + 1,
        kind: p.kind,
        description: String(p.description ?? '').trim(),
        evidence_required: String(p.evidence_required ?? '').trim(),
      })),
    }
    const errors = validateTerms(input, rules)
    if (errors.length) throw createError({ statusCode: 400, statusMessage: 'The terms are not valid', data: { errors } })

    const mediatorId = ws.mediator_id ?? settings.default_mediator_id
    const [mediator] = mediatorId ? await tx`select id from users where id = ${mediatorId} and role = 'mediator' and status = 'active'` : []
    if (!mediator) bad('No Mediator has been assigned yet. An admin must assign one before terms can be proposed.', 409)

    await tx`update terms_versions set status = 'superseded' where workspace_id = ${ws.id} and status = 'proposed'`
    const [{ next }] = await tx`select coalesce(max(version_number), 0) + 1 as next from terms_versions where workspace_id = ${ws.id}`
    const [version] = await tx`
      insert into terms_versions (workspace_id, version_number, working_hours, communication_channel, ownership_terms,
        cancellation_terms, warranty_period_days, holdback_percentage, payment_phases, materials_budget_percentage,
        fee_percentage, execution_period_days, mediator_id, mandatory_clauses, proposed_by)
      values (${ws.id}, ${next}, ${input.working_hours ?? ''}, ${input.communication_channel ?? ''}, ${input.ownership_terms ?? ''},
        ${input.cancellation_terms ?? ''}, ${input.warranty_period_days}, ${rules.holdbackPercentage}, ${tx.json(input.payment_phases as never)},
        ${input.materials_budget_percentage}, ${rules.feePercentage}, ${input.execution_period_days}, ${mediator.id},
        ${tx.json(clausesFor(input.warranty_period_days, rules.holdbackPercentage) as never)}, ${user.id})
      returning *`
    await touch(tx, ws.id)
    await audit(tx, { event_type: 'terms_proposed', actor_id: user.id, workspace_id: ws.id, payload: { version_number: next } })
    await notify(tx, { user_id: otherParty(ws, party), type: 'terms_proposed', title: `Terms version ${next} proposed`, link: `/workspaces/${ws.id}` })
    return version
  })
})
