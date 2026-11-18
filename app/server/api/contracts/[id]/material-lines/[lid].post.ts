// Order status of one line of "materials bought from third parties" (round 2b, D29, O20). Set by the
// contractor: not ordered, ordered, delivered — for example "ordered" when he bought with his own
// money from a supplier without a GoodCompany account (the budget for that line stays in the escrow
// until the final payout, P21). Information only: no approval, window or trigger. The client is told
// the new status, never an amount or the route.
import { MATERIAL_STATUSES, MATERIAL_STATUS_LABEL, type MaterialStatus } from '../../../../../shared/materials'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { status } = await readBody<{ status?: string }>(event)
  if (!MATERIAL_STATUSES.includes(status as MaterialStatus)) bad(`Status must be one of ${MATERIAL_STATUSES.join(', ')}`)
  return db().begin(async (tx) => {
    const { contract, party } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    if (party !== 'contractor') bad('Only the contractor updates the order status')
    if (!['active', 'completed'].includes(contract.status)) bad(`The contract is ${contract.status.replace('_', ' ')}`)
    const [line] = await tx`update contract_material_lines set status = ${status!}, updated_by = ${user.id}, updated_at = now()
                             where id = ${getRouterParam(event, 'lid')!} and contract_id = ${contract.id} returning id, description, status`
    if (!line) bad('Material line not found', 404)
    await audit(tx, { event_type: 'material_line_status', actor_id: user.id, contract_id: contract.id, payload: { line_id: line.id, status } })
    await notify(tx, { user_id: contract.client_id, type: 'materials_status', title: `Material "${line.description}": ${MATERIAL_STATUS_LABEL[status as MaterialStatus]}`, link: `/contracts/${contract.id}` })
    return line
  })
})
