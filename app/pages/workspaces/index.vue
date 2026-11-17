<script setup lang="ts">
const api = useApi()
const list = ref<any[]>([])
onMounted(async () => { list.value = await api('/api/workspaces') })
</script>
<template>
  <div>
    <h1>Negotiation Workspaces</h1>
    <div class="card">
      <p v-if="!list.length" class="muted">No workspaces yet. Contractors open one by responding to a job.</p>
      <table v-else>
        <thead><tr><th>Job</th><th>With</th><th>You are</th><th>Stage</th><th>Last activity</th></tr></thead>
        <tbody><tr v-for="w in list" :key="w.id">
          <td><NuxtLink :to="`/workspaces/${w.id}`">{{ w.job_title }}</NuxtLink></td>
          <td>{{ w.other_party_name }}</td><td>{{ w.my_party }}</td>
          <td><span class="tag" :class="{ grey: w.stage === 'closed' }">{{ w.stage === 'closed' ? w.outcome.replaceAll('_', ' ') : w.stage.replace('_', ' ') }}</span></td>
          <td class="small">{{ new Date(w.last_activity_at).toLocaleString() }}</td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>
