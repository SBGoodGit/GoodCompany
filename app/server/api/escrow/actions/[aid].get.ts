export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const [a] = await db()`select * from escrow_actions where id = ${getRouterParam(event, 'aid')!}`
  if (!a) bad('Action not found', 404)
  const { contract, party } = await loadContractForParty(db(), a.contract_id, user.id)
  if (party === 'client' && a.action_type === 'pay_supplier') bad('Action not found', 404)
  const sigs = await db()`select user_id, created_at from attestations where subject_type = 'escrow_action' and subject_id = ${a.id}`
  return { ...a, contract_id: contract.id, signatures: sigs }
})
