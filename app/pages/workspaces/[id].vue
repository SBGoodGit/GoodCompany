<script setup lang="ts">
// Negotiation Workspace (round 2, D28): the contractor owns the plan. The client moves candidates in,
// answers the intake (with the budget range), states constraints, accepts or responds to the terms,
// and accepts the itemised quote. The contractor proposes terms and builds the estimate.
import { validateTerms } from '~~/shared/terms'
import { computeEstimate, LINE_KINDS, SECTION_KINDS, SECTION_KIND_LABEL, type EstimateLineInput } from '~~/shared/estimate'
import { toMinor } from '~~/shared/money'

const api = useApi()
const route = useRoute()
const d = ref<any>(null)
const error = ref('')
const notice = ref('')
const STAGES = ['introduction', 'technical_intake', 'terms', 'quote', 'contract_preview']
const label = (s: string) => s.replace('_', ' ').replace(/^./, (c) => c.toUpperCase())

async function load() {
  d.value = await api(`/api/workspaces/${route.params.id}`)
  if (!termsForm.payment_phases.length) resetTermsForm()
  if (!constraintsLoaded) loadConstraints()
  if (!estimateLoaded) loadEstimate()
  note.value = d.value.workspace.client_note ?? ''
}
onMounted(load)
watch(() => route.params.id, () => { constraintsLoaded = false; estimateLoaded = false; termsForm.payment_phases = []; load() })

async function act(fn: () => Promise<any>, ok = '') {
  error.value = ''
  notice.value = ''
  try { await fn(); if (ok) notice.value = ok; await load() } catch (e) { error.value = apiError(e) }
}
const post = (path: string, body: any = {}, headers: any = {}) => api(`/api/workspaces/${route.params.id}${path}`, { method: 'POST', body, headers })

const ws = computed(() => d.value?.workspace)
const mine = (uid: string) => uid === d.value?.me
const stageIndex = computed(() => (ws.value?.stage === 'closed' ? (ws.value.outcome === 'accepted' ? 5 : -1) : STAGES.indexOf(ws.value?.stage)))
const isClient = computed(() => d.value?.my_party === 'client')
const isContractor = computed(() => d.value?.my_party === 'contractor')
const open = computed(() => ws.value && ws.value.stage !== 'closed')
const money = (v: number | null | undefined) => (v === null || v === undefined ? '—' : new Intl.NumberFormat('en-GB', { style: 'currency', currency: d.value?.rules.currency ?? 'EUR' }).format(v / 100))
const decimal = (v: number | null | undefined) => (v === null || v === undefined ? '' : (v / 100).toFixed(2))

// Client tools: switching between conversations, private note, candidate limits (D28 §E, §F)
const switchTo = (id: string) => navigateTo(`/workspaces/${id}`)
const note = ref('')
const saveNote = () => act(() => post('/note', { note: note.value }), 'Note saved (only you can see it)')
const slots = computed(() => d.value?.candidates)

// Chat
const chat = ref('')
const sendMessage = () => act(async () => { await post('/messages', { body: chat.value }); chat.value = '' })

// Constraints (client states, contractor reads)
const constraints = reactive({ start: '', end: '', days: '', access: '' })
let constraintsLoaded = false
function loadConstraints() {
  const w = d.value?.workspace
  if (!w) return
  Object.assign(constraints, { start: w.constraint_start?.slice(0, 10) ?? '', end: w.constraint_end?.slice(0, 10) ?? '', days: w.constraint_days ?? '', access: w.constraint_access ?? '' })
  constraintsLoaded = true
}
const saveConstraints = () => act(() => post('/constraints', { start: constraints.start || null, end: constraints.end || null, days: constraints.days, access: constraints.access }), 'Constraints saved')
const hasConstraints = computed(() => ws.value && (ws.value.constraint_start || ws.value.constraint_end || ws.value.constraint_days || ws.value.constraint_access))
const constraintsEditable = computed(() => isClient.value && ['introduction', 'technical_intake', 'terms', 'quote'].includes(ws.value?.stage))

// Intake (two directions + budget)
const answers = reactive<Record<string, string>>({})
watch(() => d.value?.intake, (list) => { for (const q of list ?? []) if (!(q.question_key in answers)) answers[q.question_key] = q.answer ?? '' }, { immediate: true })
const answererOf = (q: any) => (q.asked_by === ws.value?.client_id ? 'contractor' : 'client')
const myQuestions = computed(() => (d.value?.intake ?? []).filter((q: any) => answererOf(q) === d.value?.my_party))
const budget = reactive({ min: '', max: '' })
watch(() => ws.value?.budget_min, () => { if (ws.value) { budget.min = decimal(ws.value.budget_min); budget.max = decimal(ws.value.budget_max) } }, { immediate: true })
const customQuestion = ref('')
const customRequired = ref(false)
const saveAnswers = () => act(() => {
  const mineAnswers = Object.fromEntries(myQuestions.value.map((q: any) => [q.question_key, answers[q.question_key] ?? '']))
  return post('/intake', { answers: mineAnswers, ...(isClient.value ? { budget_min: budget.min, budget_max: budget.max } : {}) })
}, 'Answers saved')
const addQuestion = () => act(async () => { await post('/intake', { custom_question: customQuestion.value, custom_required: customRequired.value }); customQuestion.value = '' })

// Terms (contractor proposes the plan; client accepts, rejects or asks for a revision)
const termsForm = reactive<any>({ payment_phases: [] })
function resetTermsForm() {
  const last = d.value?.terms_versions?.[0]
  const src = last ?? {
    working_hours: 'Weekdays 08:00–17:00', communication_channel: 'GoodCompany workspace', ownership_terms: '', cancellation_terms: '',
    warranty_period_days: d.value?.rules.warranty_default ?? 30, execution_period_days: 30,
    payment_phases: [{ sequence: 1, kind: 'final', description: 'Delivery of the whole job', evidence_required: 'Photos of the finished work' }],
  }
  Object.assign(termsForm, JSON.parse(JSON.stringify({
    working_hours: src.working_hours, communication_channel: src.communication_channel, ownership_terms: src.ownership_terms,
    cancellation_terms: src.cancellation_terms, warranty_period_days: src.warranty_period_days, execution_period_days: src.execution_period_days,
    payment_phases: src.payment_phases.map((p: any) => ({ kind: p.kind, description: p.description, evidence_required: p.evidence_required })),
  })))
}
function addPhase(kind: string) {
  const finalIdx = termsForm.payment_phases.findIndex((p: any) => p.kind === 'final')
  const phase = { kind, description: '', evidence_required: '' }
  if (finalIdx === -1) termsForm.payment_phases.push(phase)
  else termsForm.payment_phases.splice(kind === 'advance' ? 0 : finalIdx, 0, phase)
}
const removePhase = (i: number) => termsForm.payment_phases.splice(i, 1)
const phasesWithSeq = computed(() => termsForm.payment_phases.map((p: any, i: number) => ({ ...p, sequence: i + 1 })))
const termsErrors = computed(() => d.value ? validateTerms({
  ...termsForm, warranty_period_days: Number(termsForm.warranty_period_days), execution_period_days: Number(termsForm.execution_period_days), payment_phases: phasesWithSeq.value,
}, { feePercentage: d.value.rules.fee_percentage, warrantyOptions: d.value.rules.warranty_options, holdbackPercentage: d.value.rules.holdback_percentage }) : [])
const proposeTerms = () => act(() => post('/terms-versions', { ...termsForm, payment_phases: phasesWithSeq.value }), 'Terms proposed')
const COMMIT_WARNING = 'You are committing to this contractor. They will now spend time preparing a quote for you.'
const acceptTerms = (vid: string) => { if (confirm(`${COMMIT_WARNING}\n\nAccept these terms?`)) act(() => post(`/terms-versions/${vid}/accept`), 'Terms accepted') }
const termsComment = ref('')
const respondTerms = (vid: string, decision: 'reject' | 'revise') => act(async () => { await post(`/terms-versions/${vid}/respond`, { decision, comment: termsComment.value }); termsComment.value = '' }, decision === 'revise' ? 'Revision requested' : 'Terms rejected')
const pendingTerms = computed(() => d.value?.terms_versions.find((t: any) => t.status === 'proposed'))
const acceptedTerms = computed(() => d.value?.terms_versions.find((t: any) => t.status === 'accepted'))
const phaseName = (seq: number) => { const p = acceptedTerms.value?.payment_phases.find((x: any) => x.sequence === seq); return p ? `${seq}. ${p.kind} — ${p.description}` : String(seq) }

// Quote: scope of work + itemised estimate (contractor), shown at the chosen detail level (client)
const quoteForm = reactive<any>({ scope_of_work: '', detail_level: 'sections', notes: '', sections: [], lines: [] })
let estimateLoaded = false
let sectionSeq = 0
function loadEstimate() {
  if (!d.value || !isContractor.value) return
  const last = d.value.quotes.find((q: any) => q.estimate)
  if (last) {
    Object.assign(quoteForm, {
      scope_of_work: last.scope_of_work, detail_level: last.detail_level, notes: last.notes,
      sections: last.estimate.sections.map((s: any) => ({ ...s })),
      lines: last.estimate.lines.map((l: any) => ({ ...l, unit_price: decimal(l.unit_price), quantity: String(l.quantity) })),
    })
    sectionSeq = quoteForm.sections.length
  } else if (!quoteForm.sections.length) addSection()
  estimateLoaded = true
}
function addSection() { sectionSeq++; quoteForm.sections.push({ key: `s${Date.now().toString(36)}${sectionSeq}`, title: '', kind: 'general' }) }
const finalPhase = computed(() => acceptedTerms.value?.payment_phases.find((p: any) => p.kind === 'final')?.sequence ?? 1)
const sectionKind = (key: string) => quoteForm.sections.find((x: any) => x.key === key)?.kind ?? 'general'
/** D29: material sections hold material lines only; own-supply materials are paid with the final phase. */
function setSectionKind(sec: any, kind: string) {
  sec.kind = kind
  for (const l of linesOf(sec.key)) {
    if (kind !== 'general') l.kind = 'material'
    else if (l.kind === 'material') l.kind = 'labour'
    if (kind === 'own_supply') l.phase = finalPhase.value
  }
}
function removeSection(i: number) {
  const key = quoteForm.sections[i].key
  quoteForm.sections.splice(i, 1)
  quoteForm.lines = quoteForm.lines.filter((l: any) => l.section !== key)
}
function addLine(section: string) {
  const k = sectionKind(section)
  quoteForm.lines.push({ section, description: '', kind: k === 'general' ? 'labour' : 'material', quantity: '1', unit: k === 'general' ? 'hour' : 'piece', unit_price: '', phase: finalPhase.value, note: '' })
}
const removeLine = (l: any) => { quoteForm.lines = quoteForm.lines.filter((x: any) => x !== l) }
const linesOf = (key: string) => quoteForm.lines.filter((l: any) => l.section === key)
const parsedLines = computed<EstimateLineInput[]>(() => quoteForm.lines.map((l: any) => {
  let unit_price = -1
  try { unit_price = toMinor(String(l.unit_price)) } catch {}
  return { ...l, quantity: Number(String(l.quantity).replace(',', '.')), unit_price, phase: Number(l.phase) }
}))
const estimate = computed(() => acceptedTerms.value
  ? computeEstimate({ sections: quoteForm.sections, lines: parsedLines.value }, acceptedTerms.value.payment_phases, { feePercentage: Number(acceptedTerms.value.fee_percentage), holdbackPercentage: Number(acceptedTerms.value.holdback_percentage) })
  : null)
const submittedQuote = computed(() => d.value?.quotes.find((q: any) => q.status === 'submitted'))
const submitQuote = () => act(() => post('/quote', {
  scope_of_work: quoteForm.scope_of_work, detail_level: quoteForm.detail_level, notes: quoteForm.notes, sections: quoteForm.sections,
  lines: parsedLines.value.map((l) => ({ ...l, unit_price: l.unit_price })),
}), 'Quote submitted')
const acceptQuote = () => act(() => post('/quote/accept'), 'Quote accepted')
const rejectReason = ref('')
const rejectQuote = () => act(() => post('/quote/reject', { reason: rejectReason.value }), 'Quote rejected')

// Preview and signing
const iSigned = computed(() => d.value?.signatures.some((s: any) => s.user_id === d.value.me))
const otherSigned = computed(() => d.value?.signatures.some((s: any) => s.user_id !== d.value.me))
async function sign() {
  const token = await requestStepUp('Sign the contract', `You sign contract snapshot ${d.value.preview.hash.slice(0, 12)}… for ${d.value.job.title}.`)
  if (!token) return
  await act(async () => {
    const r = await post('/sign', { snapshot_hash: d.value.preview.hash }, { 'x-step-up-token': token })
    if (r.status === 'contract_created') await navigateTo(`/contracts/${r.contract_id}`)
  }, 'Signed')
}
const rejectContract = () => act(() => post('/reject'), 'Contract rejected')
function withdraw() {
  const swapStage = isClient.value && ['technical_intake', 'terms'].includes(ws.value.stage)
  const msg = swapStage
    ? `Close this candidate? This counts as one of your ${slots.value?.swaps_max ?? 2} candidate swaps for this job (${slots.value?.swaps_used ?? 0} used).`
    : 'Withdraw from this workspace? This closes it for both parties.'
  if (confirm(msg)) act(() => post('/withdraw'), 'Workspace closed')
}
const advance = () => act(() => post('/advance'))
</script>

<template>
  <div v-if="d">
    <div class="row">
      <h2 class="section-title">{{ d.job.title }}</h2>
      <span class="tag" :class="{ grey: !open }">{{ open ? label(ws.stage) : ws.outcome.replaceAll('_', ' ') }}</span>
      <span class="spacer" />
      <button v-if="open" class="btn danger small" data-test="withdraw" @click="withdraw">{{ isClient ? 'Close this candidate' : 'Withdraw' }}</button>
    </div>
    <p class="small muted">
      Client: {{ d.names[ws.client_id] }} · Contractor: <NuxtLink :to="`/users/${ws.contractor_id}`">{{ d.names[ws.contractor_id] }}</NuxtLink>
      · You are the {{ d.my_party }}
    </p>
    <div v-if="isClient && slots?.workspaces?.length > 1" class="row small" style="margin-bottom: 0.5rem">
      <label for="switch" style="margin: 0">Other conversations for this job</label>
      <select id="switch" :value="ws.id" style="max-width: 360px" data-test="switch-conversation" @change="switchTo(($event.target as HTMLSelectElement).value)">
        <option v-for="w in slots.workspaces" :key="w.id" :value="w.id">{{ w.contractor_name }} — {{ w.stage === 'closed' ? w.outcome.replaceAll('_', ' ') : label(w.stage) }}</option>
      </select>
      <NuxtLink :to="`/jobs/${d.job.id}`">Overview</NuxtLink>
    </div>
    <div v-if="ws.parent_contract_id" class="info small">Extra work as a linked contract with its own escrow. <NuxtLink :to="`/contracts/${ws.parent_contract_id}`">Open the first contract</NuxtLink></div>
    <UiStageStepper :stages="STAGES.map(label)" :current="stageIndex" />
    <div v-if="ws.outcome === 'closed_other_selected'" class="notice">This job was awarded to another contractor. The workspace is closed.</div>
    <div v-if="d.contract" class="info">Contract signed. <NuxtLink :to="`/contracts/${d.contract.id}`">Open the contract</NuxtLink></div>
    <div v-if="error" class="error" data-test="error">{{ error }}</div>
    <div v-if="notice" class="info" data-test="notice">{{ notice }}</div>

    <!-- Private note (client only) -->
    <details v-if="isClient" class="card small" data-test="private-note">
      <summary><b>Private note</b> <span class="muted">— only you see this; never shown to the contractor, no effect on reputation</span></summary>
      <textarea v-model="note" data-test="private-note-text" />
      <button class="btn secondary small" style="margin-top: 0.5rem" data-test="save-note" @click="saveNote">Save note</button>
    </details>

    <!-- Introduction chat -->
    <div class="card">
      <h3>Conversation</h3>
      <div class="chat">
        <p v-if="!d.messages.length" class="muted small">No messages yet.</p>
        <div v-for="m in d.messages" :key="m.id" class="msg" :class="{ mine: mine(m.sender_id) }">
          <div class="small muted">{{ d.names[m.sender_id] }} · {{ new Date(m.created_at).toLocaleString() }}</div>{{ m.body }}
        </div>
      </div>
      <form v-if="open" class="row" style="margin-top: 0.5rem" @submit.prevent="sendMessage">
        <input v-model="chat" placeholder="Write a message" style="flex: 1" /><button class="btn" type="submit">Send</button>
      </form>
      <div v-if="ws.stage === 'introduction'" style="margin-top: 0.75rem">
        <template v-if="isClient">
          <p v-if="slots" class="small muted">Candidates past the introduction: {{ slots.active }} of {{ slots.limit }} · swaps used {{ slots.swaps_used }} of {{ slots.swaps_max }}.</p>
          <button class="btn" data-test="advance" @click="advance">Move this candidate to the technical intake</button>
        </template>
        <p v-else class="small muted">The client decides whether to move you into the technical intake. Introduce yourself and answer the client's questions in the meantime.</p>
      </div>
    </div>

    <!-- Client constraints -->
    <div v-if="open || hasConstraints" class="card" data-test="constraints">
      <h3>Constraints for the work</h3>
      <form v-if="constraintsEditable" @submit.prevent="saveConstraints">
        <p class="small muted">Tell the contractor when and how the work can be done. They see this while drafting the plan.</p>
        <div class="grid2">
          <div><label for="c-start">Work possible from</label><input id="c-start" v-model="constraints.start" type="date" data-test="constraint-start" /></div>
          <div><label for="c-end">Work possible until</label><input id="c-end" v-model="constraints.end" type="date" data-test="constraint-end" /></div>
        </div>
        <label for="c-days">Available days</label><input id="c-days" v-model="constraints.days" placeholder="For example: only Wednesdays and Fridays" data-test="constraint-days" />
        <label for="c-access">Access and logistics on location</label><textarea id="c-access" v-model="constraints.access" placeholder="Parking, stairs, keys, storage space…" data-test="constraint-access" />
        <button class="btn secondary small" type="submit" style="margin-top: 0.5rem" data-test="save-constraints">Save constraints</button>
      </form>
      <div v-else class="small">
        <p v-if="!hasConstraints" class="muted">The client has not stated any constraints yet.</p>
        <template v-else>
          <div>Period: {{ ws.constraint_start?.slice(0, 10) ?? 'open' }} – {{ ws.constraint_end?.slice(0, 10) ?? 'open' }}</div>
          <div v-if="ws.constraint_days">Available days: {{ ws.constraint_days }}</div>
          <div v-if="ws.constraint_access">Access and logistics: {{ ws.constraint_access }}</div>
        </template>
      </div>
    </div>

    <!-- Technical intake -->
    <div v-if="stageIndex >= 1 || (!open && d.intake.some((q: any) => q.answer))" class="card">
      <h3>Technical intake</h3>
      <p class="small muted">Both parties can ask questions. Each of you answers the questions addressed to you.</p>
      <div class="info small" data-test="budget">
        <b>Budget for this project</b> <span class="tag orange">required</span> — asked of the client, visible only in this conversation.
        <div v-if="isClient && ws.stage === 'technical_intake'" class="grid2" style="margin-top: 0.5rem">
          <div><label for="b-min">Minimum ({{ d.rules.currency }})</label><input id="b-min" v-model="budget.min" inputmode="decimal" data-test="budget-min" /></div>
          <div><label for="b-max">Maximum ({{ d.rules.currency }})</label><input id="b-max" v-model="budget.max" inputmode="decimal" data-test="budget-max" /></div>
        </div>
        <div v-else>{{ ws.budget_min !== null ? `${money(ws.budget_min)} – ${money(ws.budget_max)}` : (isClient ? 'Not given' : 'Waiting for the client') }}</div>
      </div>
      <form @submit.prevent="saveAnswers">
        <div v-for="q in d.intake" :key="q.question_key">
          <label :for="`q-${q.question_key}`">{{ q.question_text }} <span v-if="q.required" class="tag orange">required</span>
            <span class="muted small"> · for the {{ answererOf(q) }}</span></label>
          <textarea v-if="answererOf(q) === d.my_party && ws.stage === 'technical_intake'" :id="`q-${q.question_key}`" v-model="answers[q.question_key]" :data-test="`intake-${q.question_key}`" />
          <p v-else class="small" :class="{ muted: !q.answer }">{{ q.answer || `Waiting for the ${answererOf(q)} to answer` }}</p>
        </div>
        <button v-if="ws.stage === 'technical_intake' && (myQuestions.length || isClient)" class="btn secondary" type="submit" data-test="save-answers">Save answers</button>
      </form>
      <form v-if="ws.stage === 'technical_intake'" class="row" style="margin-top: 0.75rem" @submit.prevent="addQuestion">
        <input v-model="customQuestion" :placeholder="`Add your own question for the ${isClient ? 'contractor' : 'client'}`" style="flex: 1" data-test="custom-question" />
        <label class="inline-check"><input v-model="customRequired" type="checkbox" /> required</label>
        <button class="btn secondary" type="submit" data-test="add-question">Add question</button>
      </form>
      <div v-if="ws.stage === 'technical_intake'" style="margin-top: 0.75rem">
        <button class="btn" data-test="advance" @click="advance">Continue to terms</button>
      </div>
    </div>

    <!-- Terms -->
    <div v-if="stageIndex >= 2" class="card">
      <h3>Terms of engagement</h3>
      <p class="small muted">The contractor proposes the plan: payment phases, warranty and execution period. Amounts follow from the itemised quote. Mediator for this contract: <b>{{ d.mediator?.display_name ?? 'not yet assigned by an admin' }}</b>; accepting the terms accepts this Mediator.</p>
      <table v-if="d.terms_versions.length" class="small">
        <thead><tr><th>Version</th><th>Warranty</th><th>Payment phases</th><th>Other</th><th>Status</th></tr></thead>
        <tbody>
          <tr v-for="t in d.terms_versions" :key="t.id">
            <td>v{{ t.version_number }}</td>
            <td>{{ t.warranty_period_days }} days · holdback {{ t.holdback_percentage }}%</td>
            <td><div v-for="p in t.payment_phases" :key="p.sequence">{{ p.sequence }}. {{ p.kind }} — {{ p.description }}<span v-if="p.evidence_required" class="muted"> (evidence: {{ p.evidence_required }})</span></div></td>
            <td>{{ t.execution_period_days }} days · fee {{ t.fee_percentage }}%<div v-if="t.working_hours" class="muted">{{ t.working_hours }}</div></td>
            <td><span class="tag" :class="{ grey: ['superseded', 'rejected'].includes(t.status), orange: ['proposed', 'revision_requested'].includes(t.status) }">{{ t.status.replace('_', ' ') }}</span>
              <div v-if="t.client_comment" class="small">Client: {{ t.client_comment }}</div></td>
          </tr>
        </tbody>
      </table>
      <div v-if="isClient && pendingTerms && ws.stage === 'terms'" class="card" style="margin-top: 0.75rem" data-test="terms-response">
        <p class="small"><b>Version {{ pendingTerms.version_number }} waits for your answer.</b></p>
        <p class="notice small">{{ COMMIT_WARNING }}</p>
        <div class="row">
          <button class="btn accent" data-test="accept-terms" @click="acceptTerms(pendingTerms.id)">Accept terms</button>
        </div>
        <label for="t-comment">Comment (required to ask for a revision)</label>
        <textarea id="t-comment" v-model="termsComment" data-test="terms-comment" />
        <div class="row" style="margin-top: 0.5rem">
          <button class="btn secondary small" data-test="revise-terms" @click="respondTerms(pendingTerms.id, 'revise')">Ask for a revision</button>
          <button class="btn danger small" data-test="reject-terms" @click="respondTerms(pendingTerms.id, 'reject')">Reject</button>
        </div>
      </div>
      <p v-if="isContractor && pendingTerms" class="small muted">Waiting for the client to accept version {{ pendingTerms.version_number }}, reject it or ask for a revision.</p>
      <p v-if="isClient && ws.stage === 'terms' && !pendingTerms" class="small muted">Waiting for the contractor to propose {{ d.terms_versions.length ? 'a new version' : 'terms' }}.</p>

      <details v-if="isContractor && ws.stage === 'terms'" :open="!pendingTerms" style="margin-top: 0.75rem">
        <summary><b>{{ d.terms_versions.length ? 'Propose a new version' : 'Propose terms' }}</b></summary>
        <form @submit.prevent="proposeTerms">
          <div class="grid2">
            <div><label for="t-warranty">Warranty period</label>
              <select id="t-warranty" v-model.number="termsForm.warranty_period_days"><option v-for="o in d.rules.warranty_options" :key="o" :value="o">{{ o }} days</option></select></div>
            <div><label>Holdback</label><input :value="`${d.rules.holdback_percentage}% (fixed)`" disabled /></div>
            <div><label for="t-exec">Execution period (days)</label><input id="t-exec" v-model.number="termsForm.execution_period_days" type="number" min="1" /></div>
            <div><label for="t-hours">Working hours</label><input id="t-hours" v-model="termsForm.working_hours" /></div>
            <div><label for="t-comm">Communication channel</label><input id="t-comm" v-model="termsForm.communication_channel" /></div>
          </div>
          <label for="t-own">Ownership terms</label><textarea id="t-own" v-model="termsForm.ownership_terms" />
          <label for="t-cancel">Cancellation terms</label><textarea id="t-cancel" v-model="termsForm.cancellation_terms" />
          <h4>Payment phases</h4>
          <p class="small muted">Set out the phases of the work. In the quote you assign every estimate line to a phase; the amounts and percentages follow from that. The final phase must come to at least {{ d.rules.holdback_percentage }}% of the contract value.</p>
          <table class="small">
            <thead><tr><th>#</th><th>Kind</th><th>Description</th><th>Evidence required</th><th /></tr></thead>
            <tbody>
              <tr v-for="(p, i) in termsForm.payment_phases" :key="i">
                <td>{{ i + 1 }}</td>
                <td><select v-model="p.kind" :data-test="`phase-kind-${i}`"><option value="advance">advance</option><option value="work">work</option><option value="final">final</option></select></td>
                <td><input v-model="p.description" :data-test="`phase-desc-${i}`" /></td>
                <td><input v-model="p.evidence_required" :disabled="p.kind === 'advance'" :data-test="`phase-evidence-${i}`" /></td>
                <td><button type="button" class="btn danger small" @click="removePhase(i)">×</button></td>
              </tr>
            </tbody>
          </table>
          <div class="row" style="margin-top: 0.5rem">
            <button type="button" class="btn secondary small" data-test="add-advance" @click="addPhase('advance')">+ advance</button>
            <button type="button" class="btn secondary small" data-test="add-work" @click="addPhase('work')">+ work phase</button>
          </div>
          <h4>Mandatory clauses</h4>
          <ol class="small"><li v-for="c in (d.terms_versions[0]?.mandatory_clauses ?? [])" :key="c.key"><b>{{ c.title }}.</b> {{ c.text }}</li></ol>
          <p v-if="!d.terms_versions.length" class="small muted">Five mandatory clauses (holdback, no insurance cover, Change Order funding, no Change Orders during warranty, warranty obligation) are added to every terms version and cannot be removed.</p>
          <div v-if="termsErrors.length" class="notice small"><div v-for="e in termsErrors" :key="e">{{ e }}</div></div>
          <button class="btn" type="submit" :disabled="termsErrors.length > 0" data-test="propose-terms">Propose terms</button>
        </form>
      </details>
    </div>

    <!-- Quote: scope of work and itemised estimate -->
    <div v-if="stageIndex >= 3" class="card">
      <h3>Quote</h3>
      <table v-if="d.quotes.length" class="small">
        <thead><tr><th>Submitted</th><th>Total</th><th>Status</th></tr></thead>
        <tbody><tr v-for="q in d.quotes" :key="q.id">
          <td>{{ new Date(q.created_at).toLocaleString() }}</td><td>{{ money(q.total_amount) }}</td><td><span class="tag">{{ q.status }}</span></td>
        </tr></tbody>
      </table>

      <div v-if="submittedQuote && (isClient || ws.stage !== 'quote')" class="small" data-test="quote-view">
        <h4>Scope of work</h4>
        <p style="white-space: pre-line">{{ submittedQuote.scope_of_work }}</p>
        <template v-if="submittedQuote.estimate">
          <h4>Estimate</h4>
          <table v-if="submittedQuote.estimate.detail_level === 'lines'" data-test="estimate-lines">
            <thead><tr><th>Section</th><th>Description</th><th>Kind</th><th>Quantity</th><th>Unit price</th><th>Amount</th><th>Phase</th></tr></thead>
            <tbody><tr v-for="(l, i) in submittedQuote.estimate.lines" :key="i">
              <td>{{ submittedQuote.estimate.sections.find((s: any) => s.key === l.section)?.title }}<div class="muted">{{ SECTION_KIND_LABEL[submittedQuote.estimate.sections.find((s: any) => s.key === l.section)?.kind ?? 'general'] }}</div></td><td>{{ l.description }}<div v-if="l.note" class="muted">{{ l.note }}</div></td>
              <td>{{ l.kind }}</td><td>{{ l.quantity }} {{ l.unit }}</td><td>{{ money(l.unit_price) }}</td><td>{{ money(l.amount) }}</td><td>{{ l.phase }}</td>
            </tr></tbody>
          </table>
          <table v-else data-test="estimate-sections">
            <thead><tr><th>Section</th><th>Kind</th><th>Amount</th></tr></thead>
            <tbody><tr v-for="s in submittedQuote.estimate.sections" :key="s.key"><td>{{ s.title }}</td><td class="muted">{{ SECTION_KIND_LABEL[s.kind ?? 'general'] }}</td><td>{{ money(s.amount) }}</td></tr></tbody>
          </table>
        </template>
        <div class="info">
          <div v-for="p in submittedQuote.phase_amounts" :key="p.sequence">Phase {{ p.sequence }} ({{ p.kind }}): {{ money(p.amount) }}<span v-if="p.percentage !== undefined"> · {{ p.percentage }}%</span></div>
          <div>Materials budget (materials bought from third parties, at selling price): {{ money(submittedQuote.materials_budget_amount) }}</div>
          <div v-if="submittedQuote.estimate?.holdback_applies === false" data-test="delivery-note">Material-only delivery: no holdback. The amount stays in the escrow until you approve the delivery.</div>
          <div>Platform fee ({{ acceptedTerms?.fee_percentage }}%), frozen at funding: {{ money(submittedQuote.fee_amount) }}</div>
          <div>Total contract amount (what the client deposits): <b data-test="quote-total">{{ money(submittedQuote.total_amount) }}</b></div>
          <div v-if="submittedQuote.notes">Notes: {{ submittedQuote.notes }}</div>
        </div>
      </div>
      <div v-if="isClient && submittedQuote && ws.stage === 'quote'" class="row" style="margin-top: 0.5rem">
        <button class="btn accent" data-test="accept-quote" @click="acceptQuote">Accept quote</button>
        <input v-model="rejectReason" placeholder="Reason for rejecting (optional)" style="flex: 1" />
        <button class="btn danger" @click="rejectQuote">Reject quote</button>
      </div>
      <p v-if="isClient && !submittedQuote && ws.stage === 'quote'" class="small muted">The contractor is preparing the quote.</p>

      <form v-if="isContractor && ws.stage === 'quote' && estimate" style="margin-top: 0.75rem" data-test="quote-builder" @submit.prevent="submitQuote">
        <label for="q-scope">Scope of work: what is delivered and what is excluded</label>
        <textarea id="q-scope" v-model="quoteForm.scope_of_work" data-test="scope-of-work" />
        <h4>Estimate</h4>
        <p class="small muted">Prices are selling prices, as charged to the client. Never enter purchase prices, suppliers or margin. Put materials in a material section: <b>materials bought from third parties</b> form the materials budget, paid from the escrow to verified suppliers; <b>materials you supply yourself</b> (own stock, own production, resold by you, or from a company connected to you) count in the final phase and are paid with the final payout. All other lines make up the phase amounts. The {{ acceptedTerms.fee_percentage }}% platform fee is added as a separate line.</p>
        <div v-for="(s, si) in quoteForm.sections" :key="s.key" class="card" :data-test="`section-${si}`">
          <div class="row">
            <input v-model="s.title" placeholder="Section title, for example Preparation" style="flex: 1" :data-test="`section-title-${si}`" />
            <select :value="s.kind ?? 'general'" style="max-width: 300px" :data-test="`section-kind-${si}`" @change="setSectionKind(s, ($event.target as HTMLSelectElement).value)">
              <option v-for="k in SECTION_KINDS" :key="k" :value="k">{{ SECTION_KIND_LABEL[k] }}</option>
            </select>
            <button type="button" class="btn danger small" @click="removeSection(si)">Remove section</button>
          </div>
          <table class="small" style="margin-top: 0.5rem">
            <thead><tr><th>Description</th><th>Kind</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Phase</th><th>Amount</th><th /></tr></thead>
            <tbody>
              <tr v-for="(l, li) in linesOf(s.key)" :key="li" :data-test="`line-${si}-${li}`">
                <td><input v-model="l.description" data-test="line-description" /><input v-model="l.note" placeholder="note (optional)" class="small" /></td>
                <td><select v-if="(s.kind ?? 'general') === 'general'" v-model="l.kind" data-test="line-kind"><option v-for="k in LINE_KINDS.filter((x) => x !== 'material')" :key="k" :value="k">{{ k }}</option></select><span v-else>material</span></td>
                <td style="width: 70px"><input v-model="l.quantity" inputmode="decimal" data-test="line-quantity" /></td>
                <td style="width: 80px"><input v-model="l.unit" data-test="line-unit" /></td>
                <td style="width: 100px"><input v-model="l.unit_price" inputmode="decimal" data-test="line-price" /></td>
                <td><select v-model.number="l.phase" :disabled="s.kind === 'own_supply'" data-test="line-phase"><option v-for="p in acceptedTerms.payment_phases" :key="p.sequence" :value="p.sequence">{{ p.sequence }}. {{ p.kind }}</option></select></td>
                <td>{{ money(estimate.lines[quoteForm.lines.indexOf(l)]?.amount) }}</td>
                <td><button type="button" class="btn danger small" @click="removeLine(l)">×</button></td>
              </tr>
            </tbody>
          </table>
          <button type="button" class="btn secondary small" :data-test="`add-line-${si}`" @click="addLine(s.key)">+ line</button>
        </div>
        <button type="button" class="btn secondary small" data-test="add-section" @click="addSection">+ section</button>

        <div class="info small" style="margin-top: 0.75rem" data-test="estimate-summary">
          <div v-for="p in estimate.phase_amounts" :key="p.sequence">{{ phaseName(p.sequence) }}: {{ money(p.amount) }} · {{ p.percentage }}%</div>
          <div>Materials budget (bought from third parties): {{ money(estimate.materials_budget_amount) }} · {{ estimate.materials_percentage }}%</div>
          <div v-if="estimate.own_supply_amount">Materials you supply, in the final phase: {{ money(estimate.own_supply_amount) }}</div>
          <div data-test="holdback-note">{{ estimate.holdback_applies ? `Holdback: ${acceptedTerms.holdback_percentage}% of the contract value, withheld from the final payout during the warranty` : 'Material-only delivery: no holdback and no warranty tranches' }}</div>
          <div>Platform fee: {{ money(estimate.fee_amount) }} · {{ estimate.fee_percentage }}%</div>
          <div>Total contract amount: <b data-test="estimate-total">{{ money(estimate.total_amount) }}</b></div>
        </div>
        <fieldset class="small" style="border: 0; padding: 0">
          <legend><b>What the client sees</b></legend>
          <label class="inline-check"><input v-model="quoteForm.detail_level" type="radio" value="sections" data-test="detail-sections" /> Section totals</label>
          <label class="inline-check"><input v-model="quoteForm.detail_level" type="radio" value="lines" data-test="detail-lines" /> All lines with unit prices</label>
        </fieldset>
        <label for="q-notes">Notes</label><textarea id="q-notes" v-model="quoteForm.notes" />
        <div v-if="estimate.errors.length" class="notice small" data-test="estimate-errors"><div v-for="e in estimate.errors" :key="e">{{ e }}</div></div>
        <button class="btn accent" type="submit" :disabled="estimate.errors.length > 0 || !quoteForm.scope_of_work.trim()" data-test="submit-quote">{{ submittedQuote ? 'Replace quote' : 'Submit quote' }}</button>
      </form>
    </div>

    <!-- Contract preview and signing -->
    <div v-if="d.preview" class="card" data-test="contract-preview">
      <h3>Contract preview</h3>
      <div class="grid2 small">
        <div>
          <div>Contract amount: <b>{{ money(d.preview.snapshot.quote.total_amount) }}</b> ({{ d.preview.snapshot.quote.currency }})</div>
          <div>Warranty: {{ d.preview.snapshot.terms.warranty_period_days }} days</div>
          <div>Holdback: {{ d.preview.snapshot.terms.holdback_percentage }}% = {{ money(d.preview.snapshot.holdback_amount) }}</div>
          <div>Execution period: {{ d.preview.snapshot.terms.execution_period_days }} days</div>
          <div>Mediator: {{ d.preview.snapshot.mediator.display_name }}</div>
        </div>
        <div>
          <div v-for="m in d.preview.snapshot.milestones" :key="m.sequence">{{ m.sequence }}. {{ m.kind }} — {{ m.description }}: {{ money(m.amount) }}</div>
          <div>Materials budget: {{ money(d.preview.snapshot.quote.materials_budget_amount) }}</div>
          <div>Platform fee: {{ money(d.preview.snapshot.quote.fee_amount) }}</div>
        </div>
      </div>
      <div v-if="d.preview.snapshot.quote.scope_of_work" class="small"><b>Scope of work:</b> <span style="white-space: pre-line">{{ d.preview.snapshot.quote.scope_of_work }}</span></div>
      <div class="notice small">{{ d.preview.snapshot.holdback_notice }}</div>
      <ol class="small"><li v-for="c in d.preview.snapshot.terms.mandatory_clauses" :key="c.key"><b>{{ c.title }}.</b> {{ c.text }}</li></ol>
      <p class="small muted">Snapshot hash (SHA-256): <code>{{ d.preview.hash }}</code></p>
      <p class="small">
        Client: <span class="tag" :class="{ grey: !d.signatures.some((s: any) => s.user_id === ws.client_id) }">{{ d.signatures.some((s: any) => s.user_id === ws.client_id) ? 'signed' : 'not signed' }}</span>
        · Contractor: <span class="tag" :class="{ grey: !d.signatures.some((s: any) => s.user_id === ws.contractor_id) }">{{ d.signatures.some((s: any) => s.user_id === ws.contractor_id) ? 'signed' : 'not signed' }}</span>
      </p>
      <template v-if="ws.stage === 'contract_preview'">
        <div class="row">
          <button v-if="!iSigned" class="btn accent" data-test="sign" @click="sign">Sign contract</button>
          <span v-else class="small">You signed. {{ otherSigned ? '' : 'Waiting for the other party.' }}</span>
          <button v-if="isClient && !iSigned" class="btn danger" @click="rejectContract">Reject contract</button>
        </div>
      </template>
    </div>
  </div>
</template>
