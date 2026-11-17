<script setup lang="ts">
import { phaseView } from '~~/shared/estimate'
// Contract detail with the simulated escrow (§11 GoodTrade — Contracts and Escrow).
// Every money action is prepared, summarised and signed with step-up; the ledger applies it
// once all required parties have signed.
const api = useApi()
const route = useRoute()
const { run, sign } = useEscrow()
const id = computed(() => route.params.id as string)
const d = ref<any>(null) // contract detail
const e = ref<any>(null) // escrow view
const ledger = ref<any[]>([])
const error = ref('')
const notice = ref('')

const ev = ref<any>(null) // final evaluation, invoices, reviews
async function load() {
  const [detail, escrow, evaluation] = await Promise.all([api(`/api/contracts/${id.value}`), api(`/api/contracts/${id.value}/escrow`), api(`/api/contracts/${id.value}/evaluation`)])
  d.value = detail
  e.value = escrow
  ev.value = evaluation
}
const review = reactive({ rating: 5, motivation: '' })
const discrepancy = ref('')
onMounted(load)
async function act(fn: () => Promise<any>, ok = '') {
  error.value = ''
  notice.value = ''
  try {
    const r = await fn()
    if (r === null) return
    notice.value = r?.status === 'awaiting_signatures' ? 'Signed. Waiting for the other party to sign.' : ok
    await load()
  } catch (x) { error.value = apiError(x) }
}
const doAction = (type: string, params: Record<string, any> = {}, ok = 'Done') => act(() => run(id.value, type, params), ok)

const s = computed(() => d.value?.contract.snapshot)
const cur = computed(() => d.value?.contract.currency ?? 'EUR')
const money = (v: number | null | undefined) => fmtMoney(v, cur.value)
const isClient = computed(() => d.value?.my_party === 'client')
const isContractor = computed(() => d.value?.my_party === 'contractor')
const status = computed(() => e.value?.contract_status)
const esc = computed(() => e.value?.escrow)
const me = computed(() => useMe().value?.user.id)
const name = (uid: string) => d.value?.names[uid] ?? 'other party'

const openRequests = computed(() => (e.value?.requests ?? []).filter((r: any) => r.status === 'open'))
/** The estimate lines (or section totals) of the phase a request covers, at the quote's detail level (D28 §C8). */
function requestLines(r: any) {
  const view = s.value?.quote?.estimate
  if (!view || r.repair_agreement_id) return []
  const m = (e.value?.milestones ?? []).find((x: any) => x.id === r.milestone_id)
  return m ? phaseView(view, m.sequence) : []
}
const requestFor = (mid: string) => openRequests.value.find((r: any) => r.milestone_id === mid && !r.repair_agreement_id)
const openDisputes = computed(() => (e.value?.disputes ?? []).filter((x: any) => ['between_parties', 'mediator_active', 'advice_issued'].includes(x.status)))
const pending = computed(() => (e.value?.actions ?? []).filter((a: any) => a.status === 'awaiting_signatures'))
const needsMySignature = (a: any) => a.required_signers.includes(me.value) && !a.signed_by.includes(me.value)
const anyFinalRequest = computed(() => (e.value?.requests ?? []).some((r: any) => r.is_final))
const effectiveRepairs = computed(() => (e.value?.repairs ?? []).filter((r: any) => r.status === 'effective'))

// Forms
const evidence = reactive<Record<string, string>>({})
const response = reactive<Record<string, { mode: string; amount: string; reason: string; question: string }>>({})
const respFor = (rid: string) => (response[rid] ??= { mode: 'approve', amount: '', reason: '', question: '' })
const answer = reactive<Record<string, string>>({})
const supplier = reactive({ email: '', amount: '' })
const materialsNote = ref('')
const co = reactive<any>({ description: '', motivation: '', amount_delta: '', new_materials_budget: '', changes: {} as Record<string, string> })
const coReject = reactive<Record<string, string>>({})
const coMsg = reactive<Record<string, string>>({})
const settlement = reactive({ to_contractor: '' })
const newMediator = ref('')
const nestedMsg = ref('')
const warrantyObjection = reactive({ amount: '', reason: '' })
const contractorDispute = reactive<Record<string, string>>({})

async function respond(r: any) {
  const f = respFor(r.id)
  if (f.mode === 'approve') return doAction('approve', { completion_request_id: r.id }, 'Approved')
  if (f.mode === 'object') return doAction('object', { completion_request_id: r.id, disputed_amount: r.requested_amount, reason: f.reason }, 'Objection recorded; the amount stays in escrow')
  if (f.mode === 'object_part') return doAction('object', { completion_request_id: r.id, disputed_amount: f.amount, reason: f.reason }, 'Objection recorded; the undisputed part was released')
  return act(() => api(`/api/contracts/${id.value}/completion-requests/${r.id}/information-request`, { method: 'POST', body: { body: f.question } }), 'Question sent')
}
const proposeCO = () => act(async () => {
  const token = await requestStepUp('Sign the Change Order proposal', 'You sign your proposal on sending. It takes effect when the other party signs to accept, including any extra deposit.')
  if (!token) return null
  await api(`/api/contracts/${id.value}/change-orders`, {
    method: 'POST', headers: { 'x-step-up-token': token },
    body: { description: co.description, motivation: co.motivation, amount_delta: co.amount_delta, new_materials_budget: co.new_materials_budget,
      milestone_changes: Object.entries(co.changes).filter(([, v]) => String(v).trim() !== '').map(([milestone_id, amount]) => ({ milestone_id, amount })) },
  })
  Object.assign(co, { description: '', motivation: '', amount_delta: '', new_materials_budget: '', changes: {} })
  return {}
}, 'Change Order proposed and signed by you')
const actionFor = (cid: string) => (e.value?.actions ?? []).find((a: any) => a.action_type === 'change_order' && a.params.change_order_id === cid && a.status === 'awaiting_signatures')
</script>

<template>
  <div v-if="d && e">
    <div class="row">
      <h1 style="margin: 0">{{ s.job.title }}</h1>
      <span class="tag" data-test="contract-status">{{ status.replace('_', ' ') }}</span>
      <span class="spacer" />
      <span class="small">Your balance: <b data-test="my-balance">{{ money(e.my_simulated_balance) }}</b> <span class="simulated">SIMULATED</span></span>
    </div>
    <p class="small muted">
      Client: {{ name(d.contract.client_id) }} · Contractor: {{ name(d.contract.contractor_id) }} · Mediator: {{ name(d.contract.mediator_id) }} · You are the {{ d.my_party }}
      <span v-if="d.contract.parent_contract_id"> · Extra work linked to <NuxtLink :to="`/contracts/${d.contract.parent_contract_id}`">the first contract</NuxtLink></span>
    </p>
    <div v-if="error" class="error" data-test="error">{{ error }}</div>
    <div v-if="notice" class="info" data-test="notice">{{ notice }}</div>

    <!-- Funding -->
    <div v-if="status === 'awaiting_funding'" class="card">
      <h3>Funding</h3>
      <p class="small">Execution may not start until the client has funded the escrow. The client deposits the full contract amount, <b>{{ money(s.quote.total_amount) }}</b>; nothing is added on top.</p>
      <button v-if="isClient" class="btn accent" data-test="fund" @click="doAction('fund', {}, 'Escrow funded: the contract is active')">Fund the escrow</button>
      <p v-else class="small muted">Waiting for the client to fund the escrow.</p>
    </div>

    <!-- Escrow overview -->
    <div v-if="esc" class="card" data-test="escrow">
      <div class="row"><h3 style="margin: 0">Escrow</h3><span class="simulated">SIMULATED BALANCES — NO REAL MONEY</span></div>
      <div class="grid2 small" style="margin-top: 0.5rem">
        <div>
          <div v-if="isContractor">Balance in escrow: <b data-test="escrow-balance">{{ money(esc.balance) }}</b></div>
          <div v-else>Balance in escrow (excluding the materials budget): <b data-test="escrow-balance">{{ money(esc.balance_excluding_materials) }}</b></div>
          <div>Contract value: {{ money(esc.contract_value) }}</div>
          <div>Platform fee frozen: {{ money(esc.fee_reserved - esc.fee_transferred) }} <span v-if="esc.fee_transferred" class="muted">({{ money(esc.fee_transferred) }} transferred)</span></div>
          <div>Materials budget: {{ money(esc.materials_budget) }}<span v-if="isContractor"> · paid to suppliers {{ money(esc.paid_to_suppliers) }} · left {{ money(esc.materials_remaining) }}</span></div>
          <div v-if="esc.client_surplus">Client surplus: {{ money(esc.client_surplus) }} <span class="muted">(returned at final settlement)</span></div>
        </div>
        <div>
          <div>Paid to contractor: {{ money(esc.paid_to_contractor) }}</div>
          <div v-if="esc.refunded_to_client">Returned to client: {{ money(esc.refunded_to_client) }}</div>
          <div>Holdback: {{ money(esc.holdback_amount) }} ({{ s.terms.holdback_percentage }}%, {{ s.terms.warranty_period_days }}-day warranty)</div>
          <div v-if="esc.disputed_amount" class="simulated">Disputed and frozen: {{ money(esc.disputed_amount) }}</div>
          <div v-if="esc.repair_held">Held for repair: {{ money(esc.repair_held) }}</div>
          <div>Mediator: {{ esc.mediator_active ? 'active on a case' : 'not active' }}</div>
        </div>
      </div>
      <div v-if="esc.holdback_tranches.length" style="margin-top: 0.5rem">
        <b class="small">Holdback tranches</b> <span class="small muted">— warranty started {{ esc.warranty_start_date?.slice(0, 10) }}; claimable from the date, never paid automatically</span>
        <table class="small"><tbody>
          <tr v-for="t in esc.holdback_tranches" :key="t.sequence">
            <td>{{ t.sequence }}</td><td>{{ money(t.amount) }}</td><td>from {{ t.claimable_from.slice(0, 10) }}</td><td><span class="tag" :class="{ orange: t.status === 'frozen', grey: t.status !== 'pending' }">{{ t.status }}</span></td>
            <td><button v-if="isContractor && t.status === 'pending'" class="btn small" :disabled="new Date(t.claimable_from) > new Date()" :data-test="`claim-tranche-${t.sequence}`" @click="doAction('claim_holdback_tranche', { sequence: t.sequence }, 'Tranche claimed')">Claim</button></td>
          </tr>
        </tbody></table>
      </div>
    </div>

    <!-- Actions waiting for signatures -->
    <div v-if="pending.length" class="card">
      <h3>Waiting for signatures</h3>
      <div v-for="a in pending" :key="a.id" class="row small" style="margin-bottom: 0.4rem">
        <span class="tag orange">{{ a.action_type.replaceAll('_', ' ') }}</span>
        <span style="flex: 1">{{ a.summary }} <span class="muted">· proposed by {{ name(a.created_by) }} · expires {{ a.expires_at.slice(0, 10) }}</span></span>
        <button v-if="needsMySignature(a)" class="btn accent small" :data-test="`sign-${a.action_type}`" @click="act(() => sign(a), 'Signed and applied')">Review and sign</button>
        <span v-else class="muted">waiting for {{ name(a.required_signers.find((x: string) => !a.signed_by.includes(x))) }}</span>
      </div>
    </div>

    <!-- Milestones and completion -->
    <div class="card">
      <h3>Milestones</h3>
      <table class="small">
        <thead><tr><th>#</th><th>Kind</th><th>Description</th><th>Amount</th><th>Status</th><th /></tr></thead>
        <tbody>
          <template v-for="m in e.milestones" :key="m.id">
            <tr>
              <td>{{ m.sequence }}</td><td>{{ m.kind }}</td><td>{{ m.description }}<div class="muted">Evidence: {{ m.evidence_required || '—' }}</div></td>
              <td>{{ money(m.amount) }}</td><td><span class="tag" :class="{ orange: m.status === 'disputed', grey: m.status === 'paid' }">{{ m.status }}</span></td>
              <td>
                <button v-if="isContractor && status === 'active' && m.kind === 'advance' && m.status === 'pending'" class="btn small" data-test="claim-advance" @click="doAction('claim_advance', { milestone_id: m.id }, 'Advance paid')">Claim advance</button>
              </td>
            </tr>
            <tr v-if="isContractor && status === 'active' && m.kind !== 'advance' && m.status === 'pending'">
              <td colspan="6">
                <div class="row">
                  <input v-model="evidence[m.id]" :placeholder="`Evidence for ${m.kind === 'final' ? 'the final delivery' : 'this milestone'}: ${m.evidence_required}`" style="flex: 1" :data-test="`evidence-${m.sequence}`" />
                  <button class="btn small" :data-test="`request-${m.sequence}`" @click="doAction('request_completion', { milestone_id: m.id, evidence_text: evidence[m.id] }, 'Completion requested')">Request {{ m.kind === 'final' ? 'final approval' : 'payment' }}</button>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>

    <!-- Open completion requests -->
    <div v-for="r in openRequests" :key="r.id" class="card" data-test="open-request">
      <h3>{{ r.repair_agreement_id ? 'Repair delivered' : r.is_final ? 'Final delivery' : 'Milestone completed' }} — {{ money(r.requested_amount) }} requested</h3>
      <table v-if="requestLines(r).length" class="small" data-test="request-lines">
        <thead><tr><th>This phase covers</th><th v-if="s.quote.estimate.detail_level === 'lines'">Quantity</th><th>Amount</th></tr></thead>
        <tbody><tr v-for="(x, i) in requestLines(r)" :key="i">
          <td>{{ x.title }}<span v-if="x.kind === 'material'" class="muted"> (material, from the materials budget)</span></td>
          <td v-if="s.quote.estimate.detail_level === 'lines'">{{ x.quantity }} {{ x.unit }} × {{ money(x.unit_price) }}</td>
          <td>{{ money(x.amount) }}</td>
        </tr></tbody>
      </table>
      <p class="small">Evidence: {{ r.evidence_text }} <span class="muted">(hash {{ r.evidence_hash.slice(0, 12) }}…)</span></p>
      <p v-if="r.response_due_at" class="small">
        Response window: <b>{{ countdown(r.response_due_at) }}</b> (until {{ r.response_due_at.slice(0, 10) }}) · payment deadline {{ r.payment_deadline_at?.slice(0, 10) }}.
        Silence is never approval and never leads to payout.
      </p>
      <div v-for="m in e.information_messages.filter((x: any) => x.completion_request_id === r.id)" :key="m.id" class="small">
        <b>{{ m.kind === 'information_request' ? 'Question' : 'Answer' }}:</b> {{ m.body }}
      </div>
      <template v-if="isClient">
        <div class="row" style="margin-top: 0.5rem">
          <label class="inline-check"><input v-model="respFor(r.id).mode" type="radio" value="approve" data-test="mode-approve" /> Approve</label>
          <label class="inline-check"><input v-model="respFor(r.id).mode" type="radio" value="object" data-test="mode-object" /> Object</label>
          <label class="inline-check"><input v-model="respFor(r.id).mode" type="radio" value="object_part" data-test="mode-object-part" /> Object in part</label>
          <label class="inline-check"><input v-model="respFor(r.id).mode" type="radio" value="ask" /> Ask for information</label>
        </div>
        <div v-if="respFor(r.id).mode === 'object_part'"><label>Disputed amount (stays frozen; the rest is released)</label><input v-model="respFor(r.id).amount" inputmode="decimal" data-test="disputed-amount" /></div>
        <div v-if="respFor(r.id).mode.startsWith('object')"><label>Reason</label><textarea v-model="respFor(r.id).reason" data-test="objection-reason" /></div>
        <div v-if="respFor(r.id).mode === 'ask'"><label>Your question</label><textarea v-model="respFor(r.id).question" /></div>
        <button class="btn accent" style="margin-top: 0.5rem" data-test="respond" @click="respond(r)">Submit response</button>
      </template>
      <form v-if="isContractor && r.awaiting_party === 'contractor'" class="row" style="margin-top: 0.5rem" @submit.prevent="act(() => api(`/api/contracts/${id}/completion-requests/${r.id}/information-response`, { method: 'POST', body: { body: answer[r.id] } }), 'Answer sent')">
        <input v-model="answer[r.id]" placeholder="Answer the client's question" style="flex: 1" /><button class="btn small" type="submit">Send answer</button>
      </form>
      <details v-if="isContractor" style="margin-top: 0.5rem" data-test="contractor-dispute">
        <summary class="small">Open a dispute on this request</summary>
        <p class="small muted">The whole requested amount ({{ money(r.requested_amount) }}) stays frozen in escrow until you and the client settle. Other milestones and payments continue as normal. Either of you can then activate the Mediator.</p>
        <label>Reason</label><textarea v-model="contractorDispute[r.id]" data-test="contractor-dispute-reason" />
        <button class="btn danger small" style="margin-top: 0.5rem" data-test="contractor-dispute-submit"
          @click="doAction('object', { completion_request_id: r.id, disputed_amount: r.requested_amount, reason: contractorDispute[r.id] }, 'Dispute opened; the requested amount stays in escrow')">Open dispute</button>
      </details>
    </div>

    <!-- Repair agreements: request approval of the repair -->
    <div v-for="ra in effectiveRepairs" :key="ra.id" class="card small">
      <h3>Repair agreement</h3>
      <p>{{ ra.description }} — held in escrow: <b>{{ money(ra.held_amount) }}</b></p>
      <div v-if="isContractor && !openRequests.some((r: any) => r.repair_agreement_id === ra.id)" class="row">
        <input v-model="evidence[ra.id]" placeholder="Evidence that the repair is done" style="flex: 1" />
        <button class="btn small" @click="doAction('request_completion', { repair_agreement_id: ra.id, evidence_text: evidence[ra.id] }, 'Repair reported')">Report repair done</button>
      </div>
    </div>

    <!-- Disputes -->
    <div v-if="e.disputes.length" class="card">
      <h3>Disputes</h3>
      <div v-for="x in e.disputes" :key="x.id" class="row small">
        <NuxtLink :to="`/disputes/${x.id}`" data-test="dispute-link">Case: {{ x.trigger.replace('_', ' ') }}</NuxtLink>
        <span>{{ money(x.disputed_amount) }}</span>
        <span class="tag" :class="{ orange: !['settled', 'withdrawn'].includes(x.status) }">{{ x.status.replaceAll('_', ' ') }}</span>
        <span v-if="x.mediator_due_at && !['settled', 'withdrawn'].includes(x.status)" class="muted">mediator period until {{ x.mediator_due_at.slice(0, 10) }}</span>
      </div>
    </div>
    <div v-if="isClient && status === 'completed'" class="card small">
      <h3>Warranty objection</h3>
      <p class="muted">Freezes unclaimed holdback tranches up to the amount you state. Tranches already claimed are final.</p>
      <div class="grid2"><div><label>Amount</label><input v-model="warrantyObjection.amount" inputmode="decimal" /></div><div><label>Reason</label><input v-model="warrantyObjection.reason" /></div></div>
      <button class="btn danger small" style="margin-top: 0.5rem" @click="doAction('object', { disputed_amount: warrantyObjection.amount, reason: warrantyObjection.reason }, 'Warranty objection recorded')">Object</button>
    </div>

    <!-- Materials (contractor only for supplier payments) -->
    <div v-if="status === 'active' || e.materials_status.length" class="card small">
      <h3>Materials</h3>
      <div v-for="(u, i) in e.materials_status" :key="i">Materials ordered · {{ new Date(u.created_at).toLocaleDateString() }} {{ u.note }}</div>
      <template v-if="isContractor && status === 'active'">
        <form class="row" @submit.prevent="act(() => api(`/api/contracts/${id}/materials-status`, { method: 'POST', body: { note: materialsNote } }), 'Status posted')">
          <input v-model="materialsNote" placeholder="Note (optional)" style="flex: 1" /><button class="btn secondary small" type="submit" data-test="materials-ordered">Post "materials ordered"</button>
        </form>
        <h4>Pay a supplier from the materials budget</h4>
        <p class="muted">Signed by you alone. Paid in full to a verified GoodCompany account. The client is told a payment was made, without the amount.</p>
        <div class="grid2"><div><label>Supplier email</label><input v-model="supplier.email" type="email" data-test="supplier-email" /></div><div><label>Amount</label><input v-model="supplier.amount" inputmode="decimal" data-test="supplier-amount" /></div></div>
        <button class="btn small" style="margin-top: 0.5rem" data-test="pay-supplier" @click="doAction('pay_supplier', { supplier_email: supplier.email, amount: supplier.amount }, 'Supplier paid')">Pay supplier</button>
        <table v-if="e.supplier_payments.length" style="margin-top: 0.5rem"><tbody><tr v-for="(p, i) in e.supplier_payments" :key="i"><td>{{ p.supplier_email }}</td><td>{{ money(p.amount) }}</td><td>{{ new Date(p.signed_at).toLocaleDateString() }}</td></tr></tbody></table>
      </template>
    </div>

    <!-- Change Orders -->
    <div v-if="esc" class="card small">
      <h3>Change Orders</h3>
      <div v-for="c in e.change_orders" :key="c.id" class="card" style="margin-bottom: 0.5rem">
        <div class="row"><b>{{ c.description }}</b><span class="tag" :class="{ orange: c.status === 'proposed' }">{{ c.status }}</span><span class="spacer" /><span>{{ c.amount_delta > 0 ? '+' : '' }}{{ money(c.amount_delta) }}</span></div>
        <div class="muted">Motivation: {{ c.motivation }} · proposed by {{ name(c.requested_by) }} · expires {{ c.expires_at.slice(0, 10) }}</div>
        <div v-for="m in e.change_order_messages.filter((x: any) => x.change_order_id === c.id)" :key="m.id">{{ m.display_name }}: {{ m.body }}</div>
        <div v-if="c.status === 'proposed'" class="row" style="margin-top: 0.4rem">
          <template v-if="c.requested_by !== me">
            <button v-if="actionFor(c.id)" class="btn accent small" data-test="accept-co" @click="act(() => sign(actionFor(c.id)), 'Change Order in effect')">Accept and sign</button>
            <input v-model="coReject[c.id]" placeholder="Reason for rejecting (required)" style="flex: 1" />
            <button class="btn danger small" @click="act(() => api(`/api/contracts/${id}/change-orders/${c.id}/reject`, { method: 'POST', body: { response_note: coReject[c.id] } }), 'Rejected')">Reject</button>
          </template>
          <button v-else class="btn secondary small" @click="act(() => api(`/api/contracts/${id}/change-orders/${c.id}/withdraw`, { method: 'POST' }), 'Withdrawn')">Withdraw</button>
        </div>
        <form class="row" style="margin-top: 0.4rem" @submit.prevent="act(async () => { await api(`/api/contracts/${id}/change-orders/${c.id}/messages`, { method: 'POST', body: { body: coMsg[c.id] } }); coMsg[c.id] = '' })">
          <input v-model="coMsg[c.id]" placeholder="Message about this Change Order" style="flex: 1" /><button class="btn secondary small" type="submit">Send</button>
        </form>
      </div>
      <details v-if="status === 'active' && !anyFinalRequest">
        <summary><b>Propose a Change Order</b></summary>
        <label>What changes</label><input v-model="co.description" data-test="co-description" />
        <label>Motivation (required)</label><textarea v-model="co.motivation" data-test="co-motivation" />
        <div class="grid2">
          <div><label>Amount change (use − for less)</label><input v-model="co.amount_delta" data-test="co-delta" /></div>
          <div><label>New materials budget (optional)</label><input v-model="co.new_materials_budget" /></div>
        </div>
        <p class="muted">Only unpaid milestones change. Milestones + materials budget + {{ esc.fee_rate }}% fee must equal the new contract value. Leave a milestone empty to keep it.</p>
        <div v-for="m in e.milestones.filter((x: any) => x.status === 'pending')" :key="m.id" class="row">
          <span style="flex: 1">{{ m.sequence }}. {{ m.description }} (now {{ money(m.amount) }})</span>
          <input v-model="co.changes[m.id]" placeholder="new amount" style="width: 140px" :data-test="`co-milestone-${m.sequence}`" />
        </div>
        <button class="btn" style="margin-top: 0.5rem" data-test="propose-co" @click="proposeCO">Propose and sign</button>
      </details>
      <p v-else-if="status === 'active'" class="muted">Change Orders are closed after the final completion request. Extra work goes into a linked contract.</p>
    </div>

    <!-- Ending, Mediator, extra work -->
    <div v-if="['active', 'completed'].includes(status)" class="card small">
      <h3>Other actions</h3>
      <div class="grid2">
        <div>
          <b>End by mutual settlement</b>
          <p class="muted">Splits the remaining balance; the contract closes. No fee if cancelled in full before any payout; otherwise the fee only on what was paid out.</p>
          <div class="row"><input v-model="settlement.to_contractor" placeholder="Amount to the contractor" style="flex: 1" /><button class="btn danger small" @click="doAction('mutual_settlement', { to_contractor: settlement.to_contractor || '0' }, 'Proposed; the other party must sign')">Propose</button></div>
        </div>
        <div>
          <b>Replace the Mediator</b> <span class="muted">(both parties sign)</span>
          <div class="row"><input v-model="newMediator" placeholder="Mediator user id" style="flex: 1" /><button class="btn secondary small" @click="doAction('replace_mediator', { mediator_id: newMediator }, 'Proposed')">Propose</button></div>
        </div>
        <div v-if="anyFinalRequest || status === 'completed'">
          <b>Extra work as a linked contract</b>
          <p class="muted">Own escrow, funded separately. It can be signed once this contract is paid out, at least in part.</p>
          <div class="row"><input v-model="nestedMsg" placeholder="Describe the extra work" style="flex: 1" />
            <button class="btn secondary small" data-test="start-nested" @click="act(async () => { const ws = await api(`/api/contracts/${id}/nested`, { method: 'POST', body: { message: nestedMsg } }); await navigateTo(`/workspaces/${ws.id}`) })">Start</button></div>
        </div>
      </div>
      <div v-for="n in e.nested_contracts" :key="n.id">Linked contract: <NuxtLink :to="`/contracts/${n.id}`">{{ n.title }}</NuxtLink> ({{ n.status }})</div>
      <div v-for="w in e.nested_workspaces.filter((x: any) => x.stage !== 'closed')" :key="w.id">Negotiation for extra work: <NuxtLink :to="`/workspaces/${w.id}`">{{ w.stage }}</NuxtLink></div>
    </div>

    <!-- Final evaluation, invoices, reviews (§5.6, §7.8) -->
    <div v-if="ev && (ev.evaluation || ev.invoices.length || ev.can_review || ev.reviews.length)" class="card small" data-test="evaluation">
      <h3>Final evaluation</h3>
      <div v-if="ev.evaluation?.client_signed_at">Signed by the contractor (final delivery) {{ ev.evaluation.contractor_signed_at?.slice(0, 10) }} and the client (approval) {{ ev.evaluation.client_signed_at.slice(0, 10) }}.</div>
      <div v-for="(n, i) in ev.evaluation?.discrepancy_notes ?? []" :key="i" class="muted">Discrepancy note ({{ n.party }}): {{ n.note }}</div>
      <form class="row" style="margin-top: 0.4rem" @submit.prevent="act(async () => { await api(`/api/contracts/${id}/evaluation/discrepancy-note`, { method: 'POST', body: { note: discrepancy } }); discrepancy = '' }, 'Note added')">
        <input v-model="discrepancy" placeholder="Add a discrepancy note (does not block completion)" style="flex: 1" /><button class="btn secondary small" type="submit">Add</button>
      </form>
      <h4>Invoices</h4>
      <p v-if="!ev.invoices.length" class="muted">Generated at final approval.</p>
      <div v-for="i in ev.invoices" :key="i.id" data-test="invoice"><code>{{ i.external_reference_id }}</code> · {{ i.kind === 'fee_statement' ? 'platform fee statement' : `invoice (${i.direction})` }} · {{ money(i.amount) }}</div>
      <h4>Reviews</h4>
      <div v-for="(r, i) in ev.reviews" :key="i">{{ name(r.reviewer_id) }} rated {{ name(r.reviewee_id) }} as {{ r.reviewee_role }}: <b>{{ r.rating }}/5</b><div v-if="r.motivation" class="muted">{{ r.motivation }}</div></div>
      <form v-if="ev.can_review" style="margin-top: 0.4rem" @submit.prevent="act(() => api(`/api/contracts/${id}/reviews`, { method: 'POST', body: review }), 'Review submitted')">
        <label>Your rating of the {{ isClient ? 'contractor' : 'client' }}</label>
        <select v-model.number="review.rating" style="width: 120px" data-test="review-rating"><option v-for="n in [5, 4, 3, 2, 1]" :key="n" :value="n">{{ n }}</option></select>
        <label>Motivation {{ review.rating <= 3 ? '(required, at least 100 characters)' : '(optional)' }} — private to the two of you</label>
        <textarea v-model="review.motivation" data-test="review-motivation" />
        <button class="btn small" type="submit" data-test="submit-review">Submit review</button>
        <p class="muted">Reviews cannot be changed or removed afterwards.</p>
      </form>
    </div>

    <!-- Frozen contract and audit trail -->
    <details class="card small">
      <summary><b>Contract, terms and mandatory clauses</b></summary>
      <div>Amount {{ money(s.quote.total_amount) }} · warranty {{ s.terms.warranty_period_days }} days · execution {{ s.terms.execution_period_days }} days · fee {{ money(s.quote.fee_amount) }}</div>
      <div v-if="s.quote.materials_amount !== null">Materials (agreed selling price): {{ money(s.quote.materials_amount) }}</div>
      <ol><li v-for="c in s.terms.mandatory_clauses" :key="c.key"><b>{{ c.title }}.</b> {{ c.text }}</li></ol>
      <div class="notice">{{ s.holdback_notice }}</div>
      <div class="muted">Snapshot hash: <code style="word-break: break-all">{{ d.contract.snapshot_hash }}</code></div>
    </details>
    <details class="card small" @toggle="($event.target as any).open && api(`/api/contracts/${id}/ledger`).then((x: any) => (ledger = x))">
      <summary><b>Ledger entries</b> <span class="simulated">SIMULATED</span></summary>
      <table><tbody><tr v-for="l in ledger" :key="l.id"><td>{{ new Date(l.timestamp).toLocaleString() }}</td><td>{{ l.action_type.replaceAll('_', ' ') }}</td><td>{{ Object.entries(l.amounts).map(([k, v]) => `${k.replaceAll('_', ' ')} ${money(v as number)}`).join(', ') }}</td></tr></tbody></table>
    </details>
    <details class="card small">
      <summary><b>Audit trail</b></summary>
      <table><tbody><tr v-for="(a, i) in d.audit_trail" :key="i"><td>{{ new Date(a.timestamp).toLocaleString() }}</td><td>{{ a.event_type.replaceAll('_', ' ') }}</td><td>{{ a.actor_name ?? 'system' }}</td></tr></tbody></table>
    </details>
  </div>
</template>
