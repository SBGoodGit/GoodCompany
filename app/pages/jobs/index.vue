<script setup lang="ts">
const api = useApi()
const me = useMe()
const role = computed(() => me.value?.user.role)
const isClient = computed(() => ['client', 'both'].includes(role.value))
const isContractor = computed(() => ['contractor', 'both'].includes(role.value))
const categories = ref<any[]>([])
const mine = ref<any[]>([])
const results = ref<any>({ jobs: [], expertise_tags: [] })
const filters = reactive({ q: '', category: '', region: '', my_expertise: true })

async function search() {
  results.value = await api('/api/jobs', { query: { ...filters, my_expertise: String(filters.my_expertise) } })
}
onMounted(async () => {
  categories.value = await api('/api/categories')
  if (isClient.value) mine.value = await api('/api/jobs/mine')
  if (isContractor.value) await search()
})
const catName = (k: string) => categories.value.find((c) => c.key === k)?.name ?? k
</script>
<template>
  <div>
    <div v-if="isClient">
      <div class="row"><h1>My jobs</h1><span class="spacer" /><NuxtLink class="btn accent" to="/jobs/new" data-test="post-job">Post a job</NuxtLink></div>
      <div class="card">
        <p v-if="!mine.length" class="muted">You have not posted a job yet.</p>
        <table v-else>
          <thead><tr><th>Title</th><th>Category</th><th>Status</th><th>Workspaces</th></tr></thead>
          <tbody>
            <tr v-for="j in mine" :key="j.id">
              <td><NuxtLink :to="`/jobs/${j.id}`">{{ j.title }}</NuxtLink></td>
              <td>{{ catName(j.category) }}</td>
              <td><span class="tag" :class="{ grey: j.status !== 'open' }">{{ j.selected_contractor_id ? 'awarded' : j.status }}</span></td>
              <td>{{ j.workspace_count }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div v-if="isContractor">
      <h1>Find jobs</h1>
      <form class="card" @submit.prevent="search">
        <div class="grid2">
          <div><label for="q">Search</label><input id="q" v-model="filters.q" placeholder="Title or description" /></div>
          <div>
            <label for="cat">Category</label>
            <select id="cat" v-model="filters.category"><option value="">Any</option><option v-for="c in categories" :key="c.key" :value="c.key">{{ c.name }}</option></select>
          </div>
          <div><label for="region">Region</label><input id="region" v-model="filters.region" /></div>
        </div>
        <label class="inline-check"><input v-model="filters.my_expertise" type="checkbox" /> Search only within my expertise
          <span class="muted small">({{ results.expertise_tags?.length ? results.expertise_tags.map(catName).join(', ') : 'no expertise set in your profile' }})</span></label>
        <button class="btn" type="submit" style="margin-top: 0.5rem">Search</button>
      </form>
      <div v-for="j in results.jobs" :key="j.id" class="card">
        <div class="row">
          <h3 style="margin: 0"><NuxtLink :to="`/jobs/${j.id}`">{{ j.title }}</NuxtLink></h3>
          <span class="tag">{{ catName(j.category) }}</span>
          <span class="tag grey">{{ j.urgency }} urgency</span>
          <span v-if="j.responded" class="tag orange">responded</span>
        </div>
        <p class="small">{{ j.description }}</p>
        <div class="small muted">{{ j.region }} · posted by {{ j.client_name }}</div>
      </div>
      <p v-if="!results.jobs.length" class="muted">No open jobs match.</p>
    </div>
  </div>
</template>
