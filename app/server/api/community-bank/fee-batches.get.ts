// Public list of fee batches: time and amount only, no per-contract data (§5.7, D10).
export default defineEventHandler(async () =>
  db()`select executed_at, fee_count, total_amount from fee_batches order by executed_at desc limit 100`)
