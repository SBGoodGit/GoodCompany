<script setup lang="ts">
const api = useApi()
const list = ref<any[]>([])
onMounted(async () => { list.value = await api('/api/contracts') })
</script>
<template>
  <div>
    <h1>My Contracts</h1>
    <div class="card">
      <p v-if="!list.length" class="muted">No contracts yet.</p>
      <table v-else>
        <thead><tr><th>Job</th><th>With</th><th>You are</th><th>Amount</th><th>Status</th></tr></thead>
        <tbody><tr v-for="c in list" :key="c.id">
          <td><NuxtLink :to="`/contracts/${c.id}`">{{ c.job_title }}</NuxtLink></td>
          <td>{{ c.other_party_name }}</td><td>{{ c.my_party }}</td>
          <td><Money :value="Number(c.total_amount)" :currency="c.currency" /></td>
          <td><span class="tag">{{ c.status.replace('_', ' ') }}</span></td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>
