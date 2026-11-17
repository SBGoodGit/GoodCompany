// The contract's ledger entries. The client does not receive supplier_payment entries (§5.4).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const id = getRouterParam(event, 'id')!
  const sql = db()
  const { party } = await loadContractForParty(sql, id, user.id)
  return sql`select id, account, action_type, amounts, resulting_balances, signers, timestamp from ledger_entries
              where contract_id = ${id}
                ${party === 'client' ? sql`and action_type not in ('supplier_payment', 'materials_release')` : sql``}
              order by id`
})
