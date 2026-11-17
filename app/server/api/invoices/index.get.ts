// GET /invoices?since=&direction= (v2): the caller's own invoices and fee statements.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const q = getQuery(event)
  const sql = db()
  const since = typeof q.since === 'string' && !Number.isNaN(Date.parse(q.since)) ? new Date(q.since) : null
  const direction = q.direction === 'issued' || q.direction === 'received' ? q.direction : null
  return sql`select i.id, i.contract_id, i.direction, i.kind, i.amount, i.currency, i.status, i.external_reference_id, i.created_at,
                    c.snapshot->'job'->>'title' as title
               from invoices i left join contracts c on c.id = i.contract_id
              where i.user_id = ${user.id}
                ${since ? sql`and i.created_at >= ${since}` : sql``}
                ${direction ? sql`and i.direction = ${direction}` : sql``}
              order by i.created_at desc`
})
