// One review per party per contract, after completion only. Motivation required for a rating of
// 3 or lower (minimum length configurable). Reviews cannot be removed or appealed (Model B).
import { validateReview } from '../../../../shared/reputation'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<{ rating?: number; motivation?: string }>(event)
  return db().begin(async (tx) => {
    const { contract, party } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    if (!['completed', 'closed'].includes(contract.status)) bad('Reviews open once the job is completed')
    const settings = await getSettings(tx)
    const rating = Number(b.rating)
    const errors = validateReview(rating, b.motivation, {
      motivationThreshold: Number(settings.mandatory_motivation_threshold ?? 3),
      motivationMinLength: Number(settings.review_motivation_min_length ?? 100),
    })
    if (errors.length) throw createError({ statusCode: 400, statusMessage: errors[0], data: { errors } })
    const reviewee = party === 'client' ? contract.contractor_id : contract.client_id
    const role = party === 'client' ? 'contractor' : 'client'
    const inserted = await tx`
      insert into reviews (contract_id, reviewer_id, reviewee_id, reviewee_role, rating, motivation)
      values (${contract.id}, ${user.id}, ${reviewee}, ${role}, ${rating}, ${b.motivation?.trim() || null})
      on conflict (contract_id, reviewer_id) do nothing returning id`
    if (!inserted.length) bad('You have already reviewed this contract', 409)
    if (role === 'contractor') await recomputeReputation(tx, reviewee)
    await audit(tx, { event_type: 'review_submitted', actor_id: user.id, contract_id: contract.id })
    await notify(tx, { user_id: reviewee, type: 'review', title: 'You received a review', link: `/contracts/${contract.id}` })
    return { ok: true }
  })
})
