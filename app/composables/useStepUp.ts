// Step-up authentication before every signature (§2.3, §10). Opens the StepUpDialog and
// resolves with a single-use token once the password is confirmed.
interface StepUpState { open: boolean; title: string; summary: string; resolve: ((t: string | null) => void) | null }

export function useStepUpState() {
  return useState<StepUpState>('stepUp', () => ({ open: false, title: '', summary: '', resolve: null }))
}

export function requestStepUp(title: string, summary: string): Promise<string | null> {
  const s = useStepUpState()
  return new Promise((resolve) => { s.value = { open: true, title, summary, resolve } })
}
