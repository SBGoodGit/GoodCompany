// Manual stage advance (round 2, D28):
// - introduction → technical_intake: the client moves a candidate in, within the candidate limits (§E).
// - technical_intake → terms: either party, once every required question is answered (both
//   directions) and the client has given the budget range (§B).
import { nextManualStage } from '../../../../shared/jobs'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'introduction', 'technical_intake')
    const patch: Record<string, unknown> = { reached_beyond_introduction: true }
    if (ws.stage === 'introduction') {
      if (party !== 'client') bad('The client moves a candidate into the technical intake')
      await tx`select id from jobs where id = ${ws.job_id} for update` // serialise candidate moves per job
      assertCanMoveIn(await candidateSlots(tx, ws.job_id))
      patch.moved_to_intake_at = new Date()
    } else {
      const [{ open }] = await tx`select count(*)::int as open from technical_intake_answers
                                   where workspace_id = ${ws.id} and required and coalesce(trim(answer), '') = ''`
      if (open > 0) bad(`${open} required intake question(s) still need an answer`)
      if (ws.budget_min === null || ws.budget_max === null) bad('The client still needs to give the budget for this project (minimum and maximum)')
    }
    const next = nextManualStage(ws.stage)!
    await touch(tx, ws.id, { stage: next, ...patch })
    await audit(tx, { event_type: 'workspace_stage_changed', actor_id: user.id, workspace_id: ws.id, payload: { from: ws.stage, to: next } })
    await notify(tx, { user_id: otherParty(ws, party), type: 'workspace_stage', title: `Workspace moved to ${next.replace('_', ' ')}`, link: `/workspaces/${ws.id}` })
    return { stage: next }
  })
})
