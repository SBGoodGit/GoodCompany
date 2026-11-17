// Access to a dispute case. Parties always; the contract's Mediator only once activated, because
// disclosure of contract content to the Mediator starts at activation (§5.5, D18).
export async function loadDispute(tx: Tx, id: string, userId: string) {
  const [d] = await tx`select * from dispute_cases where id = ${id}`
  if (!d) bad('Case not found', 404)
  const [k] = await tx`select * from contracts where id = ${d.contract_id}`
  const role = k.client_id === userId ? 'client' : k.contractor_id === userId ? 'contractor'
    : k.mediator_id === userId && d.mediator_activated_at ? 'mediator' : null
  if (!role) bad('Case not found', 404)
  return { dispute: d, contract: k, role: role as 'client' | 'contractor' | 'mediator' }
}

export async function requireMediator(tx: Tx, id: string, userId: string) {
  const r = await loadDispute(tx, id, userId)
  if (r.role !== 'mediator') bad('Only the assigned Mediator can do this', 403)
  if (!['mediator_active', 'advice_issued'].includes(r.dispute.status)) bad('This case is closed')
  return r
}

export async function notifyParties(tx: Tx, k: any, title: string, body = '', link?: string) {
  for (const uid of [k.client_id, k.contractor_id]) await notify(tx, { user_id: uid, type: 'dispute', title, body, link: link ?? `/contracts/${k.id}` })
}
