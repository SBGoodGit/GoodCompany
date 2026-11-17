// Manual stage advance: introduction → technical_intake → terms. Either party. Leaving
// technical_intake requires all required intake questions to be answered (v2 §4.3).
import { nextManualStage } from '../../../../shared/jobs'

export default defineEventHandler(async (event) => {
  const user = await requireUser(event)
  return db().begin(async (tx) => {
    const { ws, party } = await loadWorkspace(tx, getRouterParam(event, 'id')!, user.id, { lock: true })
    requireStage(ws, 'introduction', 'technical_intake')
    if (ws.stage === 'technical_intake') {
      const [{ open }] = await tx`select count(*)::int as open from technical_intake_answers
                                   where workspace_id = ${ws.id} and required and coalesce(trim(answer), '') = ''`
      if (open > 0) bad(`${open} required intake question(s) still need an answer`)
    }
    const next = nextManualStage(ws.stage)!
    await touch(tx, ws.id, { stage: next, reached_beyond_introduction: true })
    await audit(tx, { event_type: 'workspace_stage_changed', actor_id: user.id, workspace_id: ws.id, payload: { from: ws.stage, to: next } })
    await notify(tx, { user_id: otherParty(ws, party), type: 'workspace_stage', title: `Workspace moved to ${next.replace('_', ' ')}`, link: `/workspaces/${ws.id}` })
    return { stage: next }
  })
})
