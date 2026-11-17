<script setup lang="ts">
// Case file for the parties (§11 GoodTrade — Disputes): settle together, activate the Mediator,
// agree a repair, read the non-binding advice. Only `settle` by both releases a disputed amount.
const api = useApi()
const route = useRoute()
const { run, sign } = useEscrow()
const d = ref<any>(null)
const error = ref('')
const notice = ref('')
const msg = ref('')
const split = reactive({ to_contractor: '', to_client: '' })
const repair = reactive({ held_amount: '', description: '' })
async function load() { d.value = await api(`/api/disputes/${route.params.id}`) }
onMounted(load)
async function act(fn: () => Promise<any>, ok = '') {
  error.value = ''; notice.value = ''
  try { const r = await fn(); if (r === null) return; notice.value = r?.status === 'awaiting_signatures' ? 'Signed. Waiting for the other party.' : ok; await load() } catch (x) { error.value = apiError(x) }
}
const x = computed(() => d.value?.dispute)
const k = computed(() => d.value?.contract)
const money = (v: number) => fmtMoney(v, k.value?.currency)
const open = computed(() => x.value && ['between_parties', 'mediator_active', 'advice_issued'].includes(x.value.status))
const doAction = (type: string, params: any, ok: string) => act(() => run(k.value.id, type, { dispute_id: x.value.id, ...params }), ok)
const pending = computed(() => (d.value?.actions ?? []).filter((a: any) => a.status === 'awaiting_signatures'))
const needsMe = (a: any) => a.required_signers.includes(d.value.me) && !a.signed_by.includes(d.value.me)
</script>
<template>
  <div v-if="d">
    <div class="row"><h1 style="margin: 0">Case: {{ k.title }}</h1><span class="tag orange" data-test="dispute-status">{{ x.status.replaceAll('_', ' ') }}</span></div>
    <p class="small muted"><NuxtLink :to="`/contracts/${k.id}`">Back to the contract</NuxtLink> · Mediator: {{ d.names[k.mediator_id] }}</p>
    <div v-if="error" class="error" data-test="error">{{ error }}</div>
    <div v-if="notice" class="info" data-test="notice">{{ notice }}</div>
    <div class="card small">
      <div>Opened by: <b>{{ x.opened_by }}</b> · trigger: {{ x.trigger.replace('_', ' ') }} · disputed amount: <b>{{ money(x.disputed_amount) }}</b> (frozen in escrow)</div>
      <div v-if="x.reason">Reason: {{ x.reason }}</div>
      <div v-if="d.request">Request: {{ d.milestone?.description }} · evidence: {{ d.request.evidence_text }}</div>
      <div v-if="x.mediator_activated_at">Mediator active since {{ x.mediator_activated_at.slice(0, 10) }}; mediator period until <b>{{ x.mediator_due_at?.slice(0, 10) }}</b></div>
      <div v-for="(e, i) in x.extensions" :key="i" class="muted">Extended to {{ e.new_due_at.slice(0, 10) }}: {{ e.reason }}</div>
      <div v-if="x.advice_notice_at && !x.advice" class="notice">The Mediator will issue advice no earlier than {{ d.advice_possible_from?.replace('T', ' ').slice(0, 16) }} UTC.</div>
      <div v-if="x.proposal" class="info"><b>Mediation proposal:</b> {{ x.proposal }}</div>
      <div v-if="x.advice" class="info" data-test="advice"><b>Non-binding advice</b> ({{ x.advice.issued_at.slice(0, 10) }}): {{ x.advice.content }}<div class="muted">Reasoning: {{ x.advice.reasoning }}</div>
        <div>If you both accept it, execute it as a settlement below. Otherwise the disputed amount stays frozen until you settle.</div></div>
    </div>

    <div v-if="pending.length" class="card small">
      <h3>Waiting for signatures</h3>
      <div v-for="a in pending" :key="a.id" class="row">
        <span style="flex: 1">{{ a.summary }} <span class="muted">· by {{ d.names[a.created_by] }}</span></span>
        <button v-if="needsMe(a)" class="btn accent small" :data-test="`sign-${a.action_type}`" @click="act(() => sign(a), 'Signed and applied')">Review and sign</button>
        <span v-else class="muted">waiting for the other party</span>
      </div>
    </div>

    <div v-if="open" class="grid2">
      <div class="card small">
        <h3>Settle together</h3>
        <p class="muted">The only action that releases the disputed amount. Both of you sign.</p>
        <div class="grid2"><div><label>To the contractor</label><input v-model="split.to_contractor" inputmode="decimal" data-test="split-contractor" /></div>
          <div><label>To the client</label><input v-model="split.to_client" inputmode="decimal" data-test="split-client" /></div></div>
        <div class="row" style="margin-top: 0.5rem">
          <button class="btn accent small" data-test="propose-settle" @click="doAction('settle', { to_contractor: split.to_contractor || '0', to_client: split.to_client || '0' }, 'Settlement proposed and signed by you')">Propose settlement</button>
          <button class="btn secondary small" @click="doAction('settle', { mode: 'withdraw' }, 'Withdrawal proposed')">Withdraw the objection</button>
        </div>
      </div>
      <div class="card small">
        <h3>Mediator</h3>
        <template v-if="x.status === 'between_parties'">
          <p class="muted">Either of you can activate the Mediator alone. The 30-day mediator period starts at activation.</p>
          <button class="btn small" data-test="activate-mediator" @click="doAction('activate_mediator', {}, 'Mediator activated')">Activate the Mediator</button>
        </template>
        <template v-else>
          <p class="muted">The Mediator mediates and may give non-binding advice. The Mediator cannot sign, force or release a payment.</p>
          <button v-if="x.opened_by === 'system'" class="btn secondary small" @click="doAction('escalate', {}, 'Escalation confirmed')">Confirm escalation</button>
        </template>
        <template v-if="d.request && !d.request.repair_agreement_id && x.scope !== 'warranty'">
          <h4>Repair agreement</h4>
          <p class="muted">Releases everything except the amount held for the repair. A new request for the repair starts a new response window.</p>
          <div class="grid2"><div><label>Held for repair</label><input v-model="repair.held_amount" inputmode="decimal" /></div><div><label>Repair</label><input v-model="repair.description" /></div></div>
          <button class="btn secondary small" style="margin-top: 0.5rem" @click="doAction('repair_agreement', repair, 'Repair agreement proposed')">Propose repair agreement</button>
        </template>
      </div>
    </div>

    <div class="card small">
      <h3>Conversation</h3>
      <div class="chat">
        <p v-if="!d.messages.length" class="muted">No messages yet.</p>
        <div v-for="m in d.messages" :key="m.id" class="msg" :class="{ mine: m.sender_id === d.me }"><div class="muted">{{ m.display_name }} · {{ new Date(m.created_at).toLocaleString() }}</div>{{ m.body }}</div>
      </div>
      <form v-if="open" class="row" style="margin-top: 0.5rem" @submit.prevent="act(async () => { await api(`/api/disputes/${x.id}/messages`, { method: 'POST', body: { body: msg } }); msg = '' })">
        <input v-model="msg" placeholder="Write a message" style="flex: 1" /><button class="btn" type="submit">Send</button>
      </form>
    </div>
  </div>
</template>
