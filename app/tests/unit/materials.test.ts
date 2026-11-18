// Round 2b (D29, O20): order status per line of "materials bought from third parties".
import { describe, expect, it } from 'vitest'
import { clientMaterialView, linesOrderedByPayment, type MaterialLine } from '../../shared/materials'

const line = (id: string, status: MaterialLine['status']): MaterialLine => ({ id, position: Number(id.slice(1)), description: `Line ${id}`, quantity: 2, unit: 'piece', amount: 12_345, status })

describe('order status per material line', () => {
  it('a supplier payment sets its linked lines to ordered, never to delivered', () => {
    const lines = [line('l1', 'not_ordered'), line('l2', 'ordered'), line('l3', 'delivered'), line('l4', 'not_ordered')]
    expect(linesOrderedByPayment(lines, ['l1', 'l2', 'l3', 'l1'])).toEqual(['l1']) // l2 stays ordered, l3 stays delivered
    expect(() => linesOrderedByPayment(lines, [])).toThrow(/at least one material line/)
    expect(() => linesOrderedByPayment(lines, ['other'])).toThrow(/does not belong/)
  })
  it('the client sees description and status only, never the amount', () => {
    const view = clientMaterialView([line('l1', 'ordered')])
    expect(view).toEqual([{ id: 'l1', position: 1, description: 'Line l1', status: 'ordered' }])
    expect(view[0]).not.toHaveProperty('amount')
  })
})
