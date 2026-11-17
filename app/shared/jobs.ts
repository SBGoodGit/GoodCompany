// Job visibility rules (§3.3): indicative_budget is a search/matching criterion for the
// client only. It is never returned to anyone but the job's own client.

export interface JobRow {
  id: string
  client_id: string
  indicative_budget: number | null
  [key: string]: unknown
}

export function jobForViewer<T extends JobRow>(job: T, viewerId: string): T | Omit<T, 'indicative_budget'> {
  if (job.client_id === viewerId) return job
  const { indicative_budget: _hidden, ...rest } = job
  return rest
}

export const WORKSPACE_STAGES = ['introduction', 'technical_intake', 'terms', 'quote', 'contract_preview', 'closed'] as const
export type WorkspaceStage = (typeof WORKSPACE_STAGES)[number]

/** Next stage for the manual "advance" action. terms→quote and quote→contract_preview happen through acceptance. */
export function nextManualStage(stage: WorkspaceStage): WorkspaceStage | null {
  if (stage === 'introduction') return 'technical_intake'
  if (stage === 'technical_intake') return 'terms'
  return null
}

export function canRespondAsContractor(role: string) {
  return role === 'contractor' || role === 'both'
}
export function canPostJobs(role: string) {
  return role === 'client' || role === 'both'
}
