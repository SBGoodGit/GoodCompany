// Order status per material line (round 2b, D29, O20). Lines in "materials bought from third parties"
// carry a status: not ordered, ordered, delivered. The contractor sets it; a supplier payment from the
// escrow sets its linked lines to ordered, never to delivered. Information only: no approval, window or
// trigger. The client sees the status, never the amount paid or the route.

export const MATERIAL_STATUSES = ['not_ordered', 'ordered', 'delivered'] as const
export type MaterialStatus = (typeof MATERIAL_STATUSES)[number]

export interface MaterialLine {
  id: string
  position: number
  description: string
  quantity: number
  unit: string
  amount: number // selling price in the estimate (contractor only)
  status: MaterialStatus
}

/** Which of the given lines a supplier payment moves to "ordered": lines not ordered yet; others keep their status. */
export function linesOrderedByPayment(lines: MaterialLine[], lineIds: string[]): string[] {
  if (!lineIds.length) throw new Error('Link the supplier payment to at least one material line')
  const byId = new Map(lines.map((l) => [l.id, l]))
  for (const id of lineIds) if (!byId.has(id)) throw new Error('A linked material line does not belong to this contract')
  return [...new Set(lineIds)].filter((id) => byId.get(id)!.status === 'not_ordered')
}

/** The client's view of the material lines: description and status only. */
export function clientMaterialView(lines: MaterialLine[]) {
  return lines.map((l) => ({ id: l.id, position: l.position, description: l.description, status: l.status }))
}

export const MATERIAL_STATUS_LABEL: Record<MaterialStatus, string> = { not_ordered: 'not ordered', ordered: 'ordered', delivered: 'delivered' }
