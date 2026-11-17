// Technical intake: the client answers questions; the contractor may add custom questions.
// Body: { answers?: { [question_key]: string }, custom_question?: string, custom_required?: boolean }
export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<{ answers?: Record<string, string>; custom_question?: string; custom_required?: boolean }>(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'technical_intake')
    if (b.custom_question?.trim()) {
      if (party !== 'contractor') bad('Only the contractor adds intake questions')
      const [{ n }] = await tx`select count(*)::int as n from technical_intake_answers where workspace_id = ${ws.id} and question_key like 'custom_%'`
      await tx`insert into technical_intake_answers (workspace_id, question_key, question_text, required, asked_by)
               values (${ws.id}, ${'custom_' + (n + 1)}, ${b.custom_question.trim()}, ${!!b.custom_required}, ${user.id})`
    }
    if (b.answers && Object.keys(b.answers).length) {
      if (party !== 'client') bad('Only the client answers intake questions')
      for (const [key, answer] of Object.entries(b.answers)) {
        await tx`update technical_intake_answers set answer = ${String(answer)}, answered_by = ${user.id}
                  where workspace_id = ${ws.id} and question_key = ${key}`
      }
    }
    await touch(tx, ws.id)
    await notify(tx, { user_id: otherParty(ws, party), type: 'workspace_intake', title: 'Technical intake updated', link: `/workspaces/${ws.id}`, dedupe_key: undefined })
    return tx`select * from technical_intake_answers where workspace_id = ${ws.id} order by created_at, question_key`
  })
})
