// Reserve dashboard and capital flow (§11 Community Bank). Simulated balances.
export default defineEventHandler(async (event) => {
  await requireUser(event)
  const sql = db()
  const settings = await getSettings()
  const reserves = await sql`select type, balance, target_percentage, min_threshold_percentage from reserves order by type`
  const total = reserves.filter((r: any) => r.type !== 'organization').reduce((a: number, r: any) => a + Number(r.balance), 0)
  const safety = reserves.find((r: any) => r.type === 'safety')
  const safetyTarget = (total * Number(settings.reserve_split?.safety ?? 60)) / 100
  const [collect] = await sql`select count(*)::int as fee_count, coalesce(sum(amount), 0)::bigint as balance from fee_collection_items where fee_batch_id is null`
  const [health] = await sql`select * from community_health_score_snapshots order by computed_at desc limit 1`
  const flow = await sql`select source_type, sum(amount)::bigint as amount, count(*)::int as n from ledger_transactions group by source_type order by source_type`
  const [loans] = await sql`select count(*) filter (where status = 'community_voting')::int as voting, count(*) filter (where status = 'active')::int as active,
                                   coalesce(sum(principal_outstanding) filter (where status = 'active'), 0)::bigint as outstanding from loan_applications`
  return {
    simulated: true,
    reserves, total,
    safety: { balance: Number(safety?.balance ?? 0), target: Math.round(safetyTarget), threshold_pct: Number(settings.safety_reserve_threshold ?? 55),
              below_threshold: Number(safety?.balance ?? 0) < (safetyTarget * Number(settings.safety_reserve_threshold ?? 55)) / 100 },
    collect_wallet: { pending_fees: collect.fee_count, balance: Number(collect.balance), min_count: Number(settings.fee_batch_min_count ?? 5) },
    health: health ?? null, flow, loans,
  }
})
