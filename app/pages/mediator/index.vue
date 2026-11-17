<script setup lang="ts">
// Mediator console (§8.6): assigned cases and the deadline overview.
const api = useApi()
const cases = ref<any[]>([])
onMounted(async () => { cases.value = await api('/api/mediator/cases') })
</script>
<template>
  <div>
    <h1>My cases</h1>
    <p class="small muted">You mediate and may give non-binding advice. You have no signing role: you cannot force or release a payment.</p>
    <div class="card">
      <p v-if="!cases.length" class="muted">No active cases.</p>
      <table v-else>
        <thead><tr><th>Contract</th><th>Trigger</th><th>Disputed</th><th>Status</th><th>Due</th></tr></thead>
        <tbody><tr v-for="c in cases" :key="c.id">
          <td><NuxtLink :to="`/mediator/cases/${c.id}`">{{ c.title }}</NuxtLink></td><td>{{ c.trigger.replace('_', ' ') }}</td>
          <td>{{ fmtMoney(c.disputed_amount, c.currency) }}</td><td><span class="tag">{{ c.status.replaceAll('_', ' ') }}</span></td>
          <td :class="{ simulated: c.mediator_due_at && new Date(c.mediator_due_at).getTime() - Date.now() < 7 * 86400000 }">{{ c.mediator_due_at?.slice(0, 10) }} <span class="muted small">{{ countdown(c.mediator_due_at) }}</span></td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>
