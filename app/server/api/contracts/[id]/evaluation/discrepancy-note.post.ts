// Either party may add a discrepancy note. It does not block completion (§5.6).
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { note } = await readBody<{ note?: string }>(event)
  if (!note?.trim()) bad('Write the note')
  return db().begin(async (tx) => {
    const { contract, party } = await loadContractForParty(tx, getRouterParam(event, 'id')!, user.id)
    const entry = { party, note: note.trim(), at: new Date().toISOString() }
    await tx`insert into final_evaluations (contract_id, discrepancy_notes) values (${contract.id}, ${tx.json([entry])})
             on conflict (contract_id) do update set discrepancy_notes = final_evaluations.discrepancy_notes || ${tx.json([entry])}`
    await audit(tx, { event_type: 'discrepancy_note', actor_id: user.id, contract_id: contract.id })
    return { ok: true }
  })
})
