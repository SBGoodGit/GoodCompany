// Only members with an open invitation vote, once (v2 §6.2). Resolution may follow immediately.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const { choice } = await readBody<{ choice?: string }>(event)
  if (choice !== 'for' && choice !== 'against') bad('Vote for or against')
  return db().begin(async (tx) => {
    const id = getRouterParam(event, 'id')!
    const [l] = await tx`select status from loan_applications where id = ${id} for update`
    if (!l || l.status !== 'community_voting') bad('Voting is closed')
    const [inv] = await tx`select id, status from vote_invitations where loan_application_id = ${id} and voter_id = ${user.id} for update`
    if (!inv || inv.status !== 'pending') bad('You have no open invitation for this application', 403)
    await tx`insert into votes (application_id, voter_id, choice) values (${id}, ${user.id}, ${choice})`
    await tx`update vote_invitations set status = 'responded', responded_at = now() where id = ${inv.id}`
    const outcome = await resolveLoan(tx, id)
    return { ok: true, outcome }
  })
})
