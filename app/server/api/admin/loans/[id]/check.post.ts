// Administrative check of a loan application before the vote (§13.2 OD5, D27). Completeness, required
// data and formal conditions only. Body: { decision: 'approve' | 'return', note } — a note is required to return.
export default defineEventHandler(async (event) => {
  const admin = await requireUser(event, { roles: ['admin'] })
  const b = await readBody<{ decision?: string; note?: string }>(event)
  if (b.decision !== 'approve' && b.decision !== 'return') bad('Decision must be approve or return')
  return db().begin((tx) => adminCheckLoan(tx, admin.id, getRouterParam(event, 'id')!, b.decision as 'approve' | 'return', String(b.note ?? '')))
})
