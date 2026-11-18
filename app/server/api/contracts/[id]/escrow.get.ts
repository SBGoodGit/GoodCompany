// EscrowAccount as read from the ledger (L3). For the client, supplier payments are hidden:
// paid_to_suppliers and the materials split are omitted, and the balance is shown excluding the
// materials budget (§5.4, §7.3). All balances are simulated.
import { contractValue, escrowBalance, unspentMaterials } from '../../../ledger/core'
import { clientMaterialView } from '../../../../shared/materials'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const sql = db()
  const { contract, party } = await loadContractForParty(sql, id, user.id)
  const state = await ledgerFor(sql).read(id)
  const a = state.account
  const [bal] = await sql`select balance from simulated_balances where user_id = ${user.id}`
  const actions = await sql`
    select a.id, a.action_type, a.params, a.summary, a.required_signers, a.status, a.expires_at, a.created_by, a.created_at, a.rejection_reason,
           coalesce((select array_agg(t.user_id) from attestations t where t.subject_type = 'escrow_action' and t.subject_id = a.id), '{}') as signed_by
      from escrow_actions a where a.contract_id = ${id}
       ${party === 'client' ? sql`and a.action_type <> 'pay_supplier'` : sql``}
     order by a.created_at desc limit 50`
  const changeOrders = await sql`select * from change_orders where contract_id = ${id} order by created_at desc`
  const coMessages = await sql`select m.*, p.display_name from change_order_messages m join profiles p on p.user_id = m.sender_id
                                where m.change_order_id in (select id from change_orders where contract_id = ${id}) order by m.created_at`
  const infoMessages = await sql`select m.* from completion_request_messages m join completion_requests r on r.id = m.completion_request_id
                                  where r.contract_id = ${id} order by m.created_at`
  // D29: order status per third-party material line. The client sees description and status only.
  const lineRows = await sql`select id, position, description, quantity::float8 as quantity, unit, amount, status from contract_material_lines
                              where contract_id = ${id} order by position`
  const materialLines = party === 'client' ? clientMaterialView(lineRows as any) : lineRows
  const supplierPayments = party === 'contractor'
    ? await sql`select s.amount, s.signed_at, s.delivery_status, u.email as supplier_email from supplier_payments s join users u on u.id = s.supplier_id
                 where s.contract_id = ${id} order by s.signed_at desc`
    : []
  const nested = await sql`select id, status, snapshot->'job'->>'title' as title from contracts where parent_contract_id = ${id}`
  const nestedWorkspaces = await sql`select id, stage, outcome from negotiation_workspaces where parent_contract_id = ${id}`
  let escrow: any = null
  if (a) {
    const base = {
      currency: a.currency, principal_total: a.principal_total, client_surplus: a.client_surplus,
      client_surplus_settled: a.client_surplus_settled, contract_value: contractValue(a), fee_rate: a.fee_rate,
      fee_reserved: a.fee_reserved, fee_transferred: a.fee_transferred, materials_budget: a.materials_budget,
      paid_to_contractor: a.paid_to_contractor, refunded_to_client: a.refunded_to_client, holdback_amount: a.holdback_amount,
      warranty_start_date: a.warranty_start_date, holdback_tranches: a.holdback_tranches, disputed_amount: a.disputed_amount,
      repair_held: a.repair_held, mediator_id: a.mediator_id, mediator_active: a.mediator_active, snapshot_hash: a.snapshot_hash,
    }
    escrow = party === 'contractor'
      ? { ...base, balance: escrowBalance(a), paid_to_suppliers: a.paid_to_suppliers, materials_released: a.materials_released, materials_remaining: unspentMaterials(a) }
      : { ...base, balance_excluding_materials: escrowBalance(a) - Math.max(0, unspentMaterials(a)) }
  }
  return {
    simulated: true,
    party,
    contract_status: contract.status,
    my_simulated_balance: Number(bal?.balance ?? 0),
    escrow,
    milestones: state.milestones,
    requests: state.requests,
    disputes: state.disputes.map((d) => ({ ...d })),
    repairs: state.repairs,
    actions,
    change_orders: changeOrders,
    change_order_messages: coMessages,
    information_messages: infoMessages,
    material_lines: materialLines,
    supplier_payments: supplierPayments,
    nested_contracts: nested,
    nested_workspaces: nestedWorkspaces,
  }
})
