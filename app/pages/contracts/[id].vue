<script setup lang="ts">
// Contract detail: frozen snapshot, milestones, audit trail. Funding and the escrow overview
// come with the simulated ledger (session 2).
const api = useApi()
const route = useRoute()
const d = ref<any>(null)
onMounted(async () => { d.value = await api(`/api/contracts/${route.params.id}`) })
const s = computed(() => d.value?.contract.snapshot)
const money = (v: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: d.value?.contract.currency ?? 'EUR' }).format(v / 100)
</script>
<template>
  <div v-if="d">
    <div class="row"><h1 style="margin: 0">{{ s.job.title }}</h1><span class="tag" data-test="contract-status">{{ d.contract.status.replace('_', ' ') }}</span></div>
    <p class="small muted">Client: {{ d.names[d.contract.client_id] }} · Contractor: {{ d.names[d.contract.contractor_id] }} · Mediator: {{ d.names[d.contract.mediator_id] }} · You are the {{ d.my_party }}</p>
    <div v-if="d.contract.status === 'awaiting_funding'" class="notice">
      Signed by both parties. Execution may not start until the client has funded the escrow (simulated in MVP1).
    </div>
    <div class="grid2">
      <div class="card small">
        <h3>Contract</h3>
        <div>Amount: <b>{{ money(s.quote.total_amount) }}</b> ({{ s.quote.currency }})</div>
        <div>Warranty {{ s.terms.warranty_period_days }} days · holdback {{ s.terms.holdback_percentage }}% = {{ money(s.holdback_amount) }}</div>
        <div>Execution period: {{ s.terms.execution_period_days }} days</div>
        <div>Materials budget: {{ money(s.quote.materials_budget_amount) }}</div>
        <div v-if="s.quote.materials_amount !== null">Materials (agreed selling price): {{ money(s.quote.materials_amount) }}</div>
        <div>Platform fee: {{ money(s.quote.fee_amount) }}</div>
        <div>Signed: {{ new Date(d.contract.signed_at).toLocaleString() }}</div>
        <div class="muted">Snapshot hash: <code style="word-break: break-all">{{ d.contract.snapshot_hash }}</code></div>
      </div>
      <div class="card small">
        <h3>Milestones</h3>
        <table><thead><tr><th>#</th><th>Kind</th><th>Description</th><th>Amount</th><th>Status</th></tr></thead>
          <tbody><tr v-for="m in d.milestones" :key="m.id"><td>{{ m.sequence }}</td><td>{{ m.kind }}</td><td>{{ m.description }}<div class="muted">{{ m.evidence_required }}</div></td><td>{{ money(m.amount) }}</td><td>{{ m.status }}</td></tr></tbody>
        </table>
      </div>
    </div>
    <div class="card small">
      <h3>Terms and mandatory clauses</h3>
      <div>Working hours: {{ s.terms.working_hours }} · Communication: {{ s.terms.communication_channel }}</div>
      <div v-if="s.terms.ownership_terms">Ownership: {{ s.terms.ownership_terms }}</div>
      <div v-if="s.terms.cancellation_terms">Cancellation: {{ s.terms.cancellation_terms }}</div>
      <ol><li v-for="c in s.terms.mandatory_clauses" :key="c.key"><b>{{ c.title }}.</b> {{ c.text }}</li></ol>
      <div class="notice">{{ s.holdback_notice }}</div>
    </div>
    <div class="card small">
      <h3>Audit trail</h3>
      <table><thead><tr><th>When</th><th>Event</th><th>By</th></tr></thead>
        <tbody><tr v-for="(a, i) in d.audit_trail" :key="i"><td>{{ new Date(a.timestamp).toLocaleString() }}</td><td>{{ a.event_type.replaceAll('_', ' ') }}</td><td>{{ a.actor_name ?? 'system' }}</td></tr></tbody>
      </table>
    </div>
  </div>
</template>
