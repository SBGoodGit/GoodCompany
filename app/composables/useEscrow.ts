// Prepare an escrow action, show its summary in the step-up dialog, then sign it.
// Nothing changes until all required parties have signed (§5.4).
export function useEscrow() {
  const api = useApi()
  async function sign(action: { id: string; summary: string }) {
    const token = await requestStepUp('Sign escrow action', action.summary)
    if (!token) return null
    return api(`/api/escrow/actions/${action.id}/sign`, { method: 'POST', headers: { 'x-step-up-token': token } })
  }
  async function run(contractId: string, type: string, params: Record<string, any> = {}) {
    const action = await api(`/api/contracts/${contractId}/escrow/actions`, { method: 'POST', body: { type, params } })
    const res = await sign(action)
    if (res?.status === 'rejected') throw { data: { statusMessage: res.action.rejection_reason } }
    return res
  }
  return { run, sign }
}

export function fmtMoney(minor: number | null | undefined, currency = 'EUR') {
  if (minor === null || minor === undefined) return '—'
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency }).format(minor / 100)
}

export function countdown(iso: string | null) {
  if (!iso) return ''
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'passed'
  const d = Math.floor(ms / 86_400_000), h = Math.floor((ms % 86_400_000) / 3_600_000)
  return `${d} days ${h} h left`
}
