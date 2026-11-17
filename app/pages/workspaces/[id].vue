<script setup lang="ts">
import { quoteBreakdown, validateTerms } from '~~/shared/terms'
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
}
onMounted(load)

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

// Chat
const chat = ref('')
const sendMessage = () => act(async () => { await post('/messages', { body: chat.value }); chat.value = '' })

// Intake
const answers = reactive<Record<string, string>>({})
watch(() => d.value?.intake, (list) => { for (const q of list ?? []) if (!(q.question_key in answers)) answers[q.question_key] = q.answer ?? '' }, { immediate: true })
const customQuestion = ref('')
const customRequired = ref(false)
const saveAnswers = () => act(() => post('/intake', { answers }), 'Answers saved')
const addQuestion = () => act(async () => { await post('/intake', { custom_question: customQuestion.value, custom_required: customRequired.value }); customQuestion.value = '' })

// Terms
const termsForm = reactive<any>({ payment_phases: [] })
function resetTermsForm() {
  const last = d.value?.terms_versions?.[0]
  const src = last ?? {
    working_hours: 'Weekdays 08:00–17:00', communication_channel: 'GoodCompany workspace', ownership_terms: '', cancellation_terms: '',
    warranty_period_days: d.value?.rules.warranty_default ?? 30, materials_budget_percentage: 0, execution_period_days: 30,
    payment_phases: [{ sequence: 1, kind: 'final', percentage: 100 - (d.value?.rules.fee_percentage ?? 2), description: 'Delivery of the whole job', evidence_required: 'Photos of the finished work' }],
  }
  Object.assign(termsForm, JSON.parse(JSON.stringify({
    working_hours: src.working_hours, communication_channel: src.communication_channel, ownership_terms: src.ownership_terms,
    cancellation_terms: src.cancellation_terms, warranty_period_days: src.warranty_period_days,
    materials_budget_percentage: src.materials_budget_percentage ?? 0, execution_period_days: src.execution_period_days,
    payment_phases: src.payment_phases,
  })))
}
function addPhase(kind: string) {
  const finalIdx = termsForm.payment_phases.findIndex((p: any) => p.kind === 'final')
  const phase = { sequence: 0, kind, percentage: 0, description: '', evidence_required: '' }
  if (finalIdx === -1) termsForm.payment_phases.push(phase)
  else termsForm.payment_phases.splice(kind === 'advance' ? 0 : finalIdx, 0, phase)
}
const removePhase = (i: number) => termsForm.payment_phases.splice(i, 1)
const phasesWithSeq = computed(() => termsForm.payment_phases.map((p: any, i: number) => ({ ...p, sequence: i + 1, percentage: Number(p.percentage) })))
const termsErrors = computed(() => d.value ? validateTerms({
  ...termsForm, warranty_period_days: Number(termsForm.warranty_period_days), execution_period_days: Number(termsForm.execution_period_days),
  materials_budget_percentage: Number(termsForm.materials_budget_percentage || 0), payment_phases: phasesWithSeq.value,
}, { feePercentage: d.value.rules.fee_percentage, warrantyOptions: d.value.rules.warranty_options, holdbackPercentage: d.value.rules.holdback_percentage }) : [])
const proposeTerms = () => act(() => post('/terms-versions', { ...termsForm, payment_phases: phasesWithSeq.value }), 'Terms proposed')
const acceptTerms = (vid: string) => act(() => post(`/terms-versions/${vid}/accept`), 'Terms accepted')
const pendingTerms = computed(() => d.value?.terms_versions.find((t: any) => t.status === 'proposed'))
const acceptedTerms = computed(() => d.value?.terms_versions.find((t: any) => t.status === 'accepted'))

// Quote
const quoteForm = reactive({ total_amount: '', materials_amount: '', notes: '' })
const quoteDraft = computed(() => {
  if (!acceptedTerms.value) return null
  try { return quoteBreakdown(toMinor(quoteForm.total_amount), acceptedTerms.value, Number(acceptedTerms.value.fee_percentage)) } catch { return null }
})
const submittedQuote = computed(() => d.value?.quotes.find((q: any) => q.status === 'submitted'))
const submitQuote = () => act(() => post('/quote', quoteForm), 'Quote submitted')
const acceptQuote = () => act(() => post('/quote/accept'), 'Quote accepted')
const rejectReason = ref('')
const rejectQuote = () => act(() => post('/quote/reject', { reason: rejectReason.value }), 'Quote rejected')

// Preview and signing
const iSigned = computed(() => d.value?.signatures.some((s: any) => s.user_id === d.value.me))
const otherSigned = computed(() => d.value?.signatures.some((s: any) => s.user_id !== d.value.me))
const candidateShort = computed(() => isClient.value && d.value?.candidates?.applies && d.value.candidates.count < d.value.candidates.required)
const override = ref(false)
async function sign() {
  const token = await requestStepUp('Sign the contract', `You sign contract snapshot ${d.value.preview.hash.slice(0, 12)}… for ${d.value.job.title}.`)
  if (!token) return
  await act(async () => {
    const r = await post('/sign', { snapshot_hash: d.value.preview.hash, override_multi_candidate: override.value }, { 'x-step-up-token': token })
    if (r.status === 'contract_created') await navigateTo(`/contracts/${r.contract_id}`)
  }, 'Signed')
}
const rejectContract = () => act(() => post('/reject'), 'Contract rejected')
const withdraw = () => { if (confirm('Withdraw from this workspace? This closes it for both parties.')) act(() => post('/withdraw'), 'Withdrawn') }
const advance = () => act(() => post('/advance'))
const money = (v: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: d.value?.rules.currency ?? 'EUR' }).format(v / 100)
</script>

<template>
  <div v-if="d">
    <div class="row">
      <h1 style="margin: 0">{{ d.job.title }}</h1>
      <span class="tag" :class="{ grey: !open }">{{ open ? label(ws.stage) : ws.outcome.replaceAll('_', ' ') }}</span>
      <span class="spacer" />
      <button v-if="open" class="btn danger small" data-test="withdraw" @click="withdraw">Withdraw</button>
    </div>
    <p class="small muted">
      Client: {{ d.names[ws.client_id] }} · Contractor: <NuxtLink :to="`/users/${ws.contractor_id}`">{{ d.names[ws.contractor_id] }}</NuxtLink>
      · You are the {{ d.my_party }}
    </p>
    <div v-if="ws.parent_contract_id" class="info small">Extra work as a linked contract with its own escrow. <NuxtLink :to="`/contracts/${ws.parent_contract_id}`">Open the first contract</NuxtLink></div>
    <div class="stepper">
      <div v-for="(s, i) in STAGES" :key="s" class="step" :class="{ done: i < stageIndex, current: i === stageIndex }">{{ label(s) }}</div>
    </div>
    <div v-if="ws.outcome === 'closed_other_selected'" class="notice">This job was awarded to another contractor. The workspace is closed.</div>
    <div v-if="d.contract" class="info">Contract signed. <NuxtLink :to="`/contracts/${d.contract.id}`">Open the contract</NuxtLink></div>
    <div v-if="error" class="error" data-test="error">{{ error }}</div>
    <div v-if="notice" class="info">{{ notice }}</div>

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
        <button class="btn" data-test="advance" @click="advance">Continue to technical intake</button>
      </div>
    </div>

    <!-- Technical intake -->
    <div v-if="stageIndex >= 1 || (!open && d.intake.some((q: any) => q.answer))" class="card">
      <h3>Technical intake</h3>
      <form @submit.prevent="saveAnswers">
        <div v-for="q in d.intake" :key="q.question_key">
          <label :for="`q-${q.question_key}`">{{ q.question_text }} <span v-if="q.required" class="tag orange">required</span></label>
          <textarea v-if="isClient && ws.stage === 'technical_intake'" :id="`q-${q.question_key}`" v-model="answers[q.question_key]" :data-test="`intake-${q.question_key}`" />
          <p v-else class="small">{{ q.answer || '—' }}</p>
        </div>
        <button v-if="isClient && ws.stage === 'technical_intake'" class="btn secondary" type="submit" data-test="save-answers">Save answers</button>
      </form>
      <form v-if="isContractor && ws.stage === 'technical_intake'" class="row" style="margin-top: 0.75rem" @submit.prevent="addQuestion">
        <input v-model="customQuestion" placeholder="Add your own question for the client" style="flex: 1" />
        <label class="inline-check"><input v-model="customRequired" type="checkbox" /> required</label>
        <button class="btn secondary" type="submit">Add question</button>
      </form>
      <div v-if="ws.stage === 'technical_intake'" style="margin-top: 0.75rem">
        <button class="btn" data-test="advance" @click="advance">Continue to terms</button>
      </div>
    </div>

    <!-- Terms -->
    <div v-if="stageIndex >= 2" class="card">
      <h3>Terms of engagement</h3>
      <p class="small muted">Mediator for this contract: <b>{{ d.mediator?.display_name ?? 'not yet assigned by an admin' }}</b>. Accepting the terms accepts this Mediator.</p>
      <table v-if="d.terms_versions.length" class="small">
        <thead><tr><th>Version</th><th>Proposed by</th><th>Warranty</th><th>Phases</th><th>Materials</th><th>Status</th><th /></tr></thead>
        <tbody>
          <tr v-for="t in d.terms_versions" :key="t.id">
            <td>v{{ t.version_number }}</td>
            <td>{{ d.names[t.proposed_by] }}</td>
            <td>{{ t.warranty_period_days }} days · holdback {{ t.holdback_percentage }}%</td>
            <td><div v-for="p in t.payment_phases" :key="p.sequence">{{ p.sequence }}. {{ p.kind }} {{ p.percentage }}% — {{ p.description }}</div></td>
            <td>{{ t.materials_budget_percentage ?? 0 }}% · fee {{ t.fee_percentage }}% · {{ t.execution_period_days }} days</td>
            <td><span class="tag" :class="{ grey: t.status === 'superseded', orange: t.status === 'proposed' }">{{ t.status }}</span></td>
            <td><button v-if="t.status === 'proposed' && !mine(t.proposed_by) && ws.stage === 'terms'" class="btn small" data-test="accept-terms" @click="acceptTerms(t.id)">Accept</button></td>
          </tr>
        </tbody>
      </table>
      <p v-if="pendingTerms && mine(pendingTerms.proposed_by)" class="small muted">Waiting for the other party to accept version {{ pendingTerms.version_number }}, or to propose a new version.</p>

      <details v-if="ws.stage === 'terms'" :open="!d.terms_versions.length" style="margin-top: 0.75rem">
        <summary><b>{{ d.terms_versions.length ? 'Propose a new version' : 'Propose terms' }}</b></summary>
        <form @submit.prevent="proposeTerms">
          <div class="grid2">
            <div><label for="t-warranty">Warranty period</label>
              <select id="t-warranty" v-model.number="termsForm.warranty_period_days"><option v-for="o in d.rules.warranty_options" :key="o" :value="o">{{ o }} days</option></select></div>
            <div><label>Holdback</label><input :value="`${d.rules.holdback_percentage}% (fixed)`" disabled /></div>
            <div><label for="t-exec">Execution period (days)</label><input id="t-exec" v-model.number="termsForm.execution_period_days" type="number" min="1" /></div>
            <div><label for="t-mat">Materials budget (% of contract value)</label><input id="t-mat" v-model="termsForm.materials_budget_percentage" type="number" min="0" step="0.01" /></div>
            <div><label for="t-hours">Working hours</label><input id="t-hours" v-model="termsForm.working_hours" /></div>
            <div><label for="t-comm">Communication channel</label><input id="t-comm" v-model="termsForm.communication_channel" /></div>
          </div>
          <label for="t-own">Ownership terms</label><textarea id="t-own" v-model="termsForm.ownership_terms" />
          <label for="t-cancel">Cancellation terms</label><textarea id="t-cancel" v-model="termsForm.cancellation_terms" />
          <h4>Payment phases</h4>
          <p class="small muted">Phases, the materials budget and the {{ d.rules.fee_percentage }}% platform fee together make 100% of the contract value. An advance is paid once the escrow is funded; the client accepts it by signing.</p>
          <table class="small">
            <thead><tr><th>#</th><th>Kind</th><th>%</th><th>Description</th><th>Evidence required</th><th /></tr></thead>
            <tbody>
              <tr v-for="(p, i) in termsForm.payment_phases" :key="i">
                <td>{{ i + 1 }}</td>
                <td><select v-model="p.kind" :data-test="`phase-kind-${i}`"><option value="advance">advance</option><option value="work">work</option><option value="final">final</option></select></td>
                <td style="width: 90px"><input v-model="p.percentage" type="number" step="0.01" min="0" :data-test="`phase-pct-${i}`" /></td>
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

    <!-- Quote -->
    <div v-if="stageIndex >= 3" class="card">
      <h3>Quote</h3>
      <table v-if="d.quotes.length" class="small">
        <thead><tr><th>Submitted</th><th>Total</th><th>Materials (informational)</th><th>Status</th></tr></thead>
        <tbody><tr v-for="q in d.quotes" :key="q.id">
          <td>{{ new Date(q.created_at).toLocaleString() }}</td><td>{{ money(q.total_amount) }}</td>
          <td>{{ q.materials_amount !== null ? money(q.materials_amount) : '—' }}</td><td><span class="tag">{{ q.status }}</span></td>
        </tr></tbody>
      </table>
      <div v-if="submittedQuote" class="info small">
        <div>Total contract amount (what the client deposits): <b>{{ money(submittedQuote.total_amount) }}</b></div>
        <div v-for="p in submittedQuote.phase_amounts" :key="p.sequence">Phase {{ p.sequence }} ({{ p.kind }}): {{ money(p.amount) }}</div>
        <div>Materials budget reserved for supplier payments: {{ money(submittedQuote.materials_budget_amount) }}</div>
        <div>Platform fee ({{ acceptedTerms?.fee_percentage }}%), frozen at funding: {{ money(submittedQuote.fee_amount) }}</div>
        <div v-if="submittedQuote.notes">Notes: {{ submittedQuote.notes }}</div>
      </div>
      <div v-if="isClient && submittedQuote && ws.stage === 'quote'" class="row" style="margin-top: 0.5rem">
        <button class="btn accent" data-test="accept-quote" @click="acceptQuote">Accept quote</button>
        <input v-model="rejectReason" placeholder="Reason for rejecting (optional)" style="flex: 1" />
        <button class="btn danger" @click="rejectQuote">Reject quote</button>
      </div>
      <form v-if="isContractor && ws.stage === 'quote'" style="margin-top: 0.75rem" @submit.prevent="submitQuote">
        <p class="small muted">Take the {{ acceptedTerms?.fee_percentage }}% platform fee into account: the client deposits exactly this total, nothing is added on top.</p>
        <div class="grid2">
          <div><label for="q-total">Total amount ({{ d.rules.currency }})</label><input id="q-total" v-model="quoteForm.total_amount" inputmode="decimal" required /></div>
          <div><label for="q-mat">Materials amount, agreed selling price (optional)</label><input id="q-mat" v-model="quoteForm.materials_amount" inputmode="decimal" /></div>
        </div>
        <label for="q-notes">Notes</label><textarea id="q-notes" v-model="quoteForm.notes" />
        <div v-if="quoteDraft" class="small info">
          <div v-for="p in quoteDraft.phase_amounts" :key="p.sequence">Phase {{ p.sequence }} ({{ p.kind }}): {{ money(p.amount) }}</div>
          <div>Materials budget: {{ money(quoteDraft.materials_budget_amount) }} · Fee: {{ money(quoteDraft.fee_amount) }}</div>
        </div>
        <button class="btn accent" type="submit" data-test="submit-quote">{{ submittedQuote ? 'Replace quote' : 'Submit quote' }}</button>
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
          <div v-if="d.preview.snapshot.quote.materials_amount !== null">Materials (agreed selling price): {{ money(d.preview.snapshot.quote.materials_amount) }}</div>
          <div>Platform fee: {{ money(d.preview.snapshot.quote.fee_amount) }}</div>
        </div>
      </div>
      <div class="notice small">{{ d.preview.snapshot.holdback_notice }}</div>
      <ol class="small"><li v-for="c in d.preview.snapshot.terms.mandatory_clauses" :key="c.key"><b>{{ c.title }}.</b> {{ c.text }}</li></ol>
      <p class="small muted">Snapshot hash (SHA-256): <code>{{ d.preview.hash }}</code></p>
      <p class="small">
        Client: <span class="tag" :class="{ grey: !d.signatures.some((s: any) => s.user_id === ws.client_id) }">{{ d.signatures.some((s: any) => s.user_id === ws.client_id) ? 'signed' : 'not signed' }}</span>
        · Contractor: <span class="tag" :class="{ grey: !d.signatures.some((s: any) => s.user_id === ws.contractor_id) }">{{ d.signatures.some((s: any) => s.user_id === ws.contractor_id) ? 'signed' : 'not signed' }}</span>
      </p>
      <template v-if="ws.stage === 'contract_preview'">
        <div v-if="candidateShort && !iSigned" class="notice small">
          GoodCompany's fairness standard asks for at least {{ d.candidates.required }} candidates on jobs of this size; this job has {{ d.candidates.count }}.
          This is a platform standard, not a legal requirement.
          <label class="inline-check"><input v-model="override" type="checkbox" data-test="override" /> Sign anyway (your choice is logged)</label>
        </div>
        <div class="row">
          <button v-if="!iSigned" class="btn accent" data-test="sign" :disabled="candidateShort && !override" @click="sign">Sign contract</button>
          <span v-else class="small">You signed. {{ otherSigned ? '' : 'Waiting for the other party.' }}</span>
          <button v-if="isClient && !iSigned" class="btn danger" @click="rejectContract">Reject contract</button>
        </div>
      </template>
    </div>
  </div>
</template>
