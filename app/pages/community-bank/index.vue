<script setup lang="ts">
// Community Bank (§11): reserve dashboard, capital flow, fee batches, my loans, my vote invitations.
const api = useApi()
const d = ref<any>(null)
const batches = ref<any[]>([])
const loans = ref<any>({ mine: [], invited: [] })
onMounted(async () => {
  ;[d.value, batches.value, loans.value] = await Promise.all([api('/api/community-bank'), $fetch('/api/community-bank/fee-batches'), api('/api/loan-applications')])
})
</script>
<template>
  <div v-if="d">
    <div class="row"><h1 style="margin: 0">Community Bank</h1><span class="simulated">SIMULATED BALANCES — NO REAL MONEY</span><span class="spacer" />
      <NuxtLink class="btn accent" to="/community-bank/apply" data-test="apply-loan">Apply for a loan</NuxtLink></div>
    <div class="grid2">
      <div class="card small">
        <h3>Reserves</h3>
        <table><tbody><tr v-for="r in d.reserves" :key="r.type"><td>{{ r.type }}</td><td>{{ fmtMoney(Number(r.balance)) }}</td><td class="muted">{{ r.type === 'organization' ? '1% of fees' : `target ${r.target_percentage}%` }}</td></tr></tbody></table>
        <p :class="d.safety.below_threshold ? 'simulated' : 'muted'">Safety reserve {{ fmtMoney(d.safety.balance) }} of target {{ fmtMoney(d.safety.target) }}.
          {{ d.safety.below_threshold ? `Below ${d.safety.threshold_pct}% of target: no new loans.` : `Minimum ${d.safety.threshold_pct}% of target.` }}</p>
      </div>
      <div class="card small">
        <h3>Capital flow</h3>
        <div>Collect-wallet: {{ d.collect_wallet.pending_fees }} fee(s) waiting, {{ fmtMoney(d.collect_wallet.balance) }}. A batch goes to the reserves once {{ d.collect_wallet.min_count }} fees are collected.</div>
        <div v-for="f in d.flow" :key="f.source_type">{{ f.source_type.replaceAll('_', ' ') }}: {{ fmtMoney(Number(f.amount)) }} ({{ f.n }})</div>
        <div>Loans: {{ d.loans.voting }} in voting, {{ d.loans.active }} active, {{ fmtMoney(Number(d.loans.outstanding)) }} outstanding</div>
        <div>Community Health Score: <b>{{ d.health?.computed_score ?? '—' }}</b></div>
      </div>
    </div>
    <div class="card small">
      <h3>Fee batches</h3>
      <p class="muted">Time and amount only. Fees are batched so that no single contract can be traced.</p>
      <p v-if="!batches.length" class="muted">No batches yet.</p>
      <table v-else><tbody><tr v-for="(b, i) in batches" :key="i"><td>{{ new Date(b.executed_at).toLocaleString() }}</td><td>{{ b.fee_count }} fees</td><td>{{ fmtMoney(Number(b.total_amount)) }}</td></tr></tbody></table>
    </div>
    <div class="grid2">
      <div class="card small">
        <h3>My loan applications</h3>
        <p v-if="!loans.mine.length" class="muted">None.</p>
        <div v-for="l in loans.mine" :key="l.id"><NuxtLink :to="`/community-bank/loans/${l.id}`">{{ l.purpose_category }} · {{ fmtMoney(l.amount_requested) }}</NuxtLink> <span class="tag">{{ l.status.replace('_', ' ') }}</span></div>
      </div>
      <div class="card small">
        <h3>Invitations to vote</h3>
        <p v-if="!loans.invited.length" class="muted">You have no open invitations. Members are invited at random.</p>
        <div v-for="l in loans.invited" :key="l.id"><NuxtLink :to="`/community-bank/loans/${l.id}`">{{ l.purpose_category }} · {{ fmtMoney(l.amount_requested) }}</NuxtLink> <span class="tag orange">{{ l.invitation_status }}</span></div>
      </div>
    </div>
  </div>
</template>
