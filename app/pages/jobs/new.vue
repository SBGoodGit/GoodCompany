<script setup lang="ts">
const api = useApi()
const categories = ref<any[]>([])
const form = reactive({ title: '', description: '', category: '', region: '', urgency: 'medium', indicative_budget: '' })
const error = ref('')
onMounted(async () => { categories.value = await api('/api/categories') })
async function submit() {
  error.value = ''
  try {
    const job = await api('/api/jobs', { method: 'POST', body: form })
    await navigateTo(`/jobs/${job.id}`)
  } catch (e) { error.value = apiError(e) }
}
</script>
<template>
  <form class="card" @submit.prevent="submit">
    
    <label for="title">Title</label><input id="title" v-model="form.title" required />
    <label for="description">Description</label><textarea id="description" v-model="form.description" />
    <div class="grid2">
      <div><label for="category">Category</label>
        <select id="category" v-model="form.category" required><option value="" disabled>Choose…</option><option v-for="c in categories" :key="c.key" :value="c.key">{{ c.name }}</option></select></div>
      <div><label for="region">Region</label><input id="region" v-model="form.region" /></div>
      <div><label for="urgency">Urgency</label>
        <select id="urgency" v-model="form.urgency"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></div>
      <div><label for="budget">Indicative budget (EUR, optional)</label><input id="budget" v-model="form.indicative_budget" inputmode="decimal" /></div>
    </div>
    <p class="small muted">Your indicative budget is only used for matching. It is never shown to contractors; a price enters the conversation only through a quote.</p>
    <div v-if="error" class="error">{{ error }}</div>
    <button class="btn accent" type="submit">Post job</button>
  </form>
</template>
