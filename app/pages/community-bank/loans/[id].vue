<script setup lang="ts">
const api = useApi()
const route = useRoute()
const d = ref<any>(null)
const error = ref('')
const notice = ref('')
const repay = ref('')
async function load() { d.value = await api(`/api/loan-applications/${route.params.id}`) }
onMounted(load)
async function act(fn: () => Promise<any>, ok: string) { error.value = ''; notice.value = ''; try { await fn(); notice.value = ok; await load() } catch (e) { error.value = apiError(e) } }
const l = computed(() => d.value?.loan)
</script>
<template>
  <div v-if="d">
    <div class="row"><h2 class="section-title">Loan: {{ l.purpose_category }}</h2><span class="tag" data-test="loan-status">{{ l.status.replace('_', ' ') }}</span><span class="simulated">SIMULATED</span></div>
    <div v-if="error" class="error" data-test="error">{{ error }}</div>
    <div v-if="notice" class="info" data-test="notice">{{ notice }}</div>
    <div class="card small">
      <div>{{ l.purpose }}</div>
      <div>Amount <b>{{ fmtMoney(l.amount_requested) }}</b> · term {{ l.repayment_term_months }} months · interest {{ l.interest_rate }}%</div>
      <div v-if="l.projected_income">Projected income (not validated): {{ fmtMoney(l.projected_income) }}</div>
      <div>Votes needed: {{ l.required_votes }} (≥ 60% for)<template v-if="l.voting_ends_at"> · voting until {{ l.voting_ends_at.slice(0, 10) }}</template></div>
      <div v-if="d.tally.for_votes !== undefined">Votes: {{ d.tally.votes }} ({{ d.tally.for_votes }} for)</div>
      <div v-else>Votes so far: {{ d.tally.votes }}</div>
    </div>
    <div v-if="l.status === 'admin_check'" class="card small info" data-test="admin-check-pending">
      Waiting for the administrative check. An administrator checks completeness, required data and formal conditions only — not whether the loan is a good idea. The vote starts after approval.
    </div>
    <div v-if="l.status === 'returned'" class="card small" data-test="admin-check-returned">
      <b>Returned after the administrative check.</b> No vote took place. Reason: {{ l.admin_check_note }}
      <div class="muted">You can submit a new application with the missing information.</div>
    </div>
    <div v-if="d.role === 'voter' && l.status === 'community_voting'" class="card small">
      <template v-if="d.my_vote">You voted <b>{{ d.my_vote }}</b>.</template>
      <template v-else-if="d.invitation?.status === 'pending'">
        <p>You were randomly invited to vote. Your vote is final.</p>
        <div class="row"><button class="btn" data-test="vote-for" @click="act(() => api(`/api/loan-applications/${l.id}/votes`, { method: 'POST', body: { choice: 'for' } }), 'Vote recorded')">Vote for</button>
          <button class="btn danger" data-test="vote-against" @click="act(() => api(`/api/loan-applications/${l.id}/votes`, { method: 'POST', body: { choice: 'against' } }), 'Vote recorded')">Vote against</button></div>
      </template>
    </div>
    <div v-if="d.role === 'applicant' && ['active', 'repaid'].includes(l.status)" class="card small">
      <h3>Sub-escrow and repayment</h3>
      <div v-if="d.sub_escrow">Sub-escrow to your supplier: {{ fmtMoney(d.sub_escrow.amount) }} — {{ d.sub_escrow.status }}</div>
      <button v-if="d.sub_escrow?.status === 'pending'" class="btn small" data-test="release" @click="act(() => api(`/api/loan-applications/${l.id}/release`, { method: 'POST' }), 'Paid to the supplier')">Release to supplier</button>
      <div>Outstanding principal: <b data-test="outstanding">{{ fmtMoney(l.principal_outstanding) }}</b> · interest paid {{ fmtMoney(l.interest_paid) }} · repaid {{ fmtMoney(l.amount_repaid) }}</div>
      <form v-if="l.status === 'active'" class="row" style="margin-top: 0.5rem" @submit.prevent="act(() => api(`/api/loan-applications/${l.id}/repayments`, { method: 'POST', body: { amount: repay } }), 'Repayment recorded')">
        <input v-model="repay" placeholder="Amount (early or partial repayment, no penalty)" style="flex: 1" data-test="repay-amount" /><button class="btn small" type="submit" data-test="repay">Repay</button>
      </form>
    </div>
  </div>
</template>
