// Technical intake in two directions (round 2, D28 §B). Either party adds own questions for the
// other; each party answers the questions addressed to it. Library questions go to the client. The
// client also gives the budget range, a standard mandatory question, visible only in this workspace.
// Body: { answers?: { [question_key]: string }, custom_question?: string, custom_required?: boolean,
//         budget_min?: string, budget_max?: string }
import { toMinor } from '../../../../shared/money'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  const b = await readBody<{ answers?: Record<string, string>; custom_question?: string; custom_required?: boolean; budget_min?: string | number; budget_max?: string | number }>(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'technical_intake')
    if (b.custom_question?.trim()) {
      const [{ n }] = await tx`select count(*)::int as n from technical_intake_answers where workspace_id = ${ws.id} and question_key like 'custom_%'`
      await tx`insert into technical_intake_answers (workspace_id, question_key, question_text, required, asked_by)
               values (${ws.id}, ${'custom_' + (n + 1)}, ${b.custom_question.trim()}, ${!!b.custom_required}, ${user.id})`
    }
    if (b.answers && Object.keys(b.answers).length) {
      for (const [key, answer] of Object.entries(b.answers)) {
        const [q] = await tx`select asked_by from technical_intake_answers where workspace_id = ${ws.id} and question_key = ${key}`
        if (!q) bad('Question not found')
        // A question asked by the client is for the contractor; library and contractor questions are for the client.
        const answerer = q.asked_by === ws.client_id ? 'contractor' : 'client'
        if (answerer !== party) bad(`This question is for the ${answerer} to answer`)
        await tx`update technical_intake_answers set answer = ${String(answer)}, answered_by = ${user.id}
                  where workspace_id = ${ws.id} and question_key = ${key}`
      }
    }
    const given = (v: unknown) => v !== undefined && v !== null && String(v).trim() !== ''
    if (given(b.budget_min) || given(b.budget_max)) {
      if (party !== 'client') bad('Only the client gives the budget')
      let min = 0, max = 0
      try { min = toMinor(String(b.budget_min ?? '')); max = toMinor(String(b.budget_max ?? '')) } catch { bad('Enter the budget as two amounts, minimum and maximum') }
      if (min <= 0 || max <= 0) bad('Both budget amounts must be greater than 0')
      if (min > max) bad('The minimum budget cannot be higher than the maximum')
      await tx`update negotiation_workspaces set budget_min = ${min}, budget_max = ${max} where id = ${ws.id}`
    }
    await touch(tx, ws.id)
    await notify(tx, { user_id: otherParty(ws, party), type: 'workspace_intake', title: 'Technical intake updated', link: `/workspaces/${ws.id}`, dedupe_key: undefined })
    return tx`select * from technical_intake_answers where workspace_id = ${ws.id} order by created_at, question_key`
  })
})
