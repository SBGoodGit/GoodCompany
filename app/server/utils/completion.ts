// What happens when the ledger reports a completed contract (§5.6, §7.8):
// FinalEvaluation signed (the final completion request and its approval are the two signatures),
// an `issued` invoice for the contractor and a `received` invoice for the client (base quote plus
// effective Change Orders, 100% — the fee is not deducted, P19), a separate platform fee statement
// for the contractor, completed-contract counters, reviews opened, reputation recomputed.
import { contractorScore, warrantyMetrics } from '../../shared/reputation'

export async function onContractCompleted(tx: Tx, contractId: string) {
  const [k] = await tx`select * from contracts where id = ${contractId}`
  const [acc] = await tx`select * from escrow_accounts where contract_id = ${contractId}`
  const [finalReq] = await tx`select requested_at from completion_requests where contract_id = ${contractId} and is_final and repair_agreement_id is null order by requested_at limit 1`
  const already = await tx`select 1 from final_evaluations where contract_id = ${contractId} and client_signed_at is not null`
  if (already.length) return

  await tx`insert into final_evaluations (contract_id, contractor_signed_at, client_signed_at, closed_at)
           values (${contractId}, ${finalReq?.requested_at ?? new Date()}, now(), now())
           on conflict (contract_id) do update set contractor_signed_at = excluded.contractor_signed_at, client_signed_at = now(), closed_at = now()`

  const amount = Number(acc.principal_total) - Number(acc.client_surplus) // base quote + effective Change Orders
  const ref = await nextInvoiceReference(tx)
  await tx`insert into invoices (user_id, contract_id, direction, kind, amount, currency, external_reference_id)
           values (${k.contractor_id}, ${contractId}, 'issued', 'invoice', ${amount}, ${k.currency}, ${ref}),
                  (${k.client_id}, ${contractId}, 'received', 'invoice', ${amount}, ${k.currency}, ${ref + '-R'})`
  const fee = Number(acc.fee_kept)
  if (fee > 0) {
    const feeRef = await nextInvoiceReference(tx, 'FEE')
    await tx`insert into invoices (user_id, contract_id, direction, kind, amount, currency, external_reference_id)
             values (${k.contractor_id}, ${contractId}, 'received', 'fee_statement', ${fee}, ${k.currency}, ${feeRef})`
  }

  await tx`update profiles set completed_as_contractor = completed_as_contractor + 1, stats_completed_jobs = stats_completed_jobs + 1 where user_id = ${k.contractor_id}`
  await tx`update profiles set completed_as_client = completed_as_client + 1 where user_id = ${k.client_id}`
  await audit(tx, { event_type: 'final_evaluation_signed', actor_id: null, contract_id: contractId, payload: { invoice: ref, amount } })
  for (const uid of [k.client_id, k.contractor_id]) {
    await notify(tx, { user_id: uid, type: 'review_open', title: 'Job completed: invoices are ready and you can leave a review', link: `/contracts/${contractId}`, dedupe_key: `completed:${contractId}` })
  }
  await recomputeReputation(tx, k.contractor_id)
}

/** Stable, unique external reference: GC-<year>-<sequence> (OD8: sequential, see BUILD_NOTES). */
export async function nextInvoiceReference(tx: Tx, prefix = 'INV') {
  const [{ n }] = await tx`select nextval('invoice_number_seq') as n`
  return `GC-${prefix}-${new Date().getFullYear()}-${String(n).padStart(6, '0')}`
}

/** Contractor score from reviews received as contractor (P8, D24). The client score is not computed (O25). */
export async function recomputeReputation(tx: Tx, userId: string) {
  const settings = await getSettings(tx)
  const reviews = await tx`
    select r.rating, (e.principal_total - e.client_surplus) as weight
      from reviews r join escrow_accounts e on e.contract_id = r.contract_id
     where r.reviewee_id = ${userId} and r.reviewee_role = 'contractor'`
  const contracts = await tx`
    select c.activated_at, (c.snapshot->'terms'->>'execution_period_days')::int as days,
           (select min(q.requested_at) from completion_requests q where q.contract_id = c.id and q.is_final and q.repair_agreement_id is null) as delivered_at
      from contracts c where c.contractor_id = ${userId} and c.status in ('completed','closed')
     order by c.completed_at desc nulls last`
  const onTime = contracts.map((c: any) => !!c.delivered_at && new Date(c.delivered_at).getTime() <= new Date(c.activated_at).getTime() + c.days * 86_400_000)
  const score = contractorScore(reviews.map((r: any) => ({ rating: r.rating, weight: Number(r.weight) })), onTime, {
    floor: Number(settings.reliability_factor_floor ?? 0.5), window: Number(settings.reliability_factor_window ?? 20),
  })
  const satisfied = reviews.length ? reviews.filter((r: any) => r.rating >= 4).length / reviews.length : null
  await tx`update profiles set reputation_score_as_contractor = ${score}, stats_satisfaction_rate = ${satisfied} where user_id = ${userId}`
}

/** Warranty metrics for a contractor's public profile (§3.1). */
export async function warrantyMetricsFor(tx: Tx, userId: string) {
  const rows = await tx`
    select (c.snapshot->'terms'->>'warranty_period_days')::int as warranty_period_days, c.status = 'closed' as warranty_finished,
           exists (select 1 from dispute_cases d where d.contract_id = c.id and d.scope = 'warranty') as had_claim
      from contracts c where c.contractor_id = ${userId} and c.status in ('completed','closed')`
  return warrantyMetrics(rows as any)
}
