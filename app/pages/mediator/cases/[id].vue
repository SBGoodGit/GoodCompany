<script setup lang="ts">
// Mediator case file and actions (§5.5): silence finding, proposal, extension, advice notice, advice.
// None of these has a ledger effect.
const api = useApi()
const route = useRoute()
const d = ref<any>(null)
const error = ref('')
const notice = ref('')
const f = reactive({ finding: '', proposal: '', reason: '', new_due_at: '', content: '', reasoning: '', msg: '' })
async function load() { d.value = await api(`/api/disputes/${route.params.id}`) }
onMounted(load)
const post = (path: string, body: any, ok: string) => async () => {
  error.value = ''; notice.value = ''
  try { await api(`/api/disputes/${route.params.id}/${path}`, { method: 'POST', body }); notice.value = ok; await load() } catch (x) { error.value = apiError(x) }
}
const x = computed(() => d.value?.dispute)
const money = (v: number) => fmtMoney(v, d.value?.contract.currency)
const open = computed(() => x.value && ['mediator_active', 'advice_issued'].includes(x.value.status))
</script>
<template>
  <div v-if="d">
    <div class="row"><h1 style="margin: 0">{{ d.contract.title }}</h1><span class="tag orange">{{ x.status.replaceAll('_', ' ') }}</span></div>
    <p class="small muted"><NuxtLink to="/mediator">All cases</NuxtLink> · Client: {{ d.names[d.contract.client_id] }} · Contractor: {{ d.names[d.contract.contractor_id] }}</p>
    <div v-if="error" class="error" data-test="error">{{ error }}</div>
    <div v-if="notice" class="info" data-test="notice">{{ notice }}</div>
    <div class="grid2">
      <div class="card small">
        <h3>Case file</h3>
        <div>Opened by {{ x.opened_by }} ({{ x.trigger.replace('_', ' ') }}) · disputed <b>{{ money(x.disputed_amount) }}</b></div>
        <div v-if="x.reason">Reason: {{ x.reason }}</div>
        <div v-if="d.request">Request: {{ d.milestone?.description }} ({{ money(d.request.requested_amount) }}) · evidence: {{ d.request.evidence_text }}</div>
        <div v-for="(m, i) in d.information" :key="i" class="muted">{{ m.kind.replace('_', ' ') }}: {{ m.body }}</div>
        <div>Activated {{ x.mediator_activated_at?.slice(0, 10) }} · due <b>{{ x.mediator_due_at?.slice(0, 10) }}</b> ({{ countdown(x.mediator_due_at) }})</div>
        <div>Contract: {{ money(d.contract.quote.total_amount) }} · warranty {{ d.contract.terms.warranty_period_days }} days</div>
        <div v-if="d.supplier_payments.length">Supplier payments: {{ d.supplier_payments.map((p: any) => money(p.amount)).join(', ') }}</div>
        <div v-if="x.silence_investigation">Silence finding: {{ x.silence_investigation }}</div>
        <div v-if="x.proposal">Proposal: {{ x.proposal }}</div>
        <div v-if="x.advice">Advice issued {{ x.advice.issued_at.slice(0, 10) }}: {{ x.advice.content }}</div>
        <h4>Timeline</h4>
        <div v-for="(t, i) in d.timeline" :key="i" class="muted">{{ new Date(t.timestamp).toLocaleString() }} · {{ t.event_type.replaceAll('_', ' ') }}</div>
      </div>
      <div v-if="open" class="card small">
        <h3>Mediator actions</h3>
        <template v-if="x.trigger === 'silence'">
          <label>Why is the party silent? (required before advice on the substance)</label>
          <textarea v-model="f.finding" /><button class="btn secondary small" @click="post('silence-finding', { finding: f.finding }, 'Finding recorded')()">Record finding</button>
        </template>
        <label>Mediation proposal</label><textarea v-model="f.proposal" data-test="proposal" />
        <button class="btn secondary small" @click="post('proposal', { proposal: f.proposal }, 'Proposal sent to both parties')()">Send proposal</button>
        <label>Extend the mediator period</label>
        <div class="row"><input v-model="f.new_due_at" type="date" style="width: 160px" /><input v-model="f.reason" placeholder="Reason" style="flex: 1" /></div>
        <button class="btn secondary small" @click="post('extension', { new_due_at: f.new_due_at, reason: f.reason }, 'Extended; both parties notified')()">Extend</button>
        <template v-if="x.status === 'mediator_active'">
          <h4>Advice</h4>
          <p v-if="!x.advice_notice_at" class="muted">First tell both parties the advice will be finalised. The advice may follow 48 hours later.</p>
          <button v-if="!x.advice_notice_at" class="btn small" data-test="advice-notice" @click="post('advice-notice', {}, 'Both parties notified')()">Notify parties</button>
          <p v-else class="muted">Notice given {{ x.advice_notice_at.slice(0, 16).replace('T', ' ') }}; advice possible from {{ d.advice_possible_from?.slice(0, 16).replace('T', ' ') }} UTC.</p>
          <label>Advice (non-binding)</label><textarea v-model="f.content" data-test="advice-content" />
          <label>Reasoning</label><textarea v-model="f.reasoning" data-test="advice-reasoning" />
          <button class="btn accent small" data-test="issue-advice" @click="post('advice', { content: f.content, reasoning: f.reasoning }, 'Advice issued')()">Issue advice</button>
        </template>
      </div>
    </div>
    <div class="card small">
      <h3>Conversation</h3>
      <div class="chat"><div v-for="m in d.messages" :key="m.id" class="msg" :class="{ mine: m.sender_id === d.me }"><div class="muted">{{ m.display_name }}</div>{{ m.body }}</div></div>
      <form v-if="open" class="row" style="margin-top: 0.5rem" @submit.prevent="post('messages', { body: f.msg }, '')().then(() => (f.msg = ''))">
        <input v-model="f.msg" placeholder="Write to both parties" style="flex: 1" /><button class="btn" type="submit">Send</button>
      </form>
    </div>
  </div>
</template>
