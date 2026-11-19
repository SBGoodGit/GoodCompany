<script setup lang="ts">
// Invoices with a stable external reference (§7.8). The platform fee appears on a separate statement (P19).
const api = useApi()
const list = ref<any[]>([])
const direction = ref('')
async function load() { list.value = await api('/api/invoices', { query: direction.value ? { direction: direction.value } : {} }) }
onMounted(load)
watch(direction, load)
</script>
<template>
  <div>
    <div class="row"><span class="spacer" />
      <select v-model="direction" style="width: 180px"><option value="">All</option><option value="issued">Issued</option><option value="received">Received</option></select></div>
    <p class="small simulated">Generated from simulated payments. Tax and bookkeeping treatment is still under specialist review (O23).</p>
    <div class="card">
      <p v-if="!list.length" class="muted">No invoices yet.</p>
      <table v-else class="small">
        <thead><tr><th>Reference</th><th>Type</th><th>Direction</th><th>For</th><th>Amount</th><th>Date</th></tr></thead>
        <tbody><tr v-for="i in list" :key="i.id">
          <td><code>{{ i.external_reference_id }}</code></td><td>{{ i.kind === 'fee_statement' ? 'Platform fee statement' : 'Invoice' }}</td><td>{{ i.direction }}</td>
          <td><NuxtLink v-if="i.contract_id" :to="`/contracts/${i.contract_id}`">{{ i.title }}</NuxtLink><span v-else>Community Bank supplier payment</span></td>
          <td>{{ fmtMoney(i.amount, i.currency) }}</td><td>{{ new Date(i.created_at).toLocaleDateString() }}</td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>
