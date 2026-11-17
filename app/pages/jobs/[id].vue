<script setup lang="ts">
const api = useApi()
const route = useRoute()
const me = useMe()
const data = ref<any>(null)
const message = ref('')
const error = ref('')
async function load() { data.value = await api(`/api/jobs/${route.params.id}`) }
onMounted(load)
const canRespond = computed(() => data.value && !data.value.is_owner && ['contractor', 'both'].includes(me.value?.user.role)
  && data.value.job.status === 'open' && !data.value.job.selected_contractor_id && !data.value.workspaces.length)
async function respond() {
  error.value = ''
  try {
    const ws = await api(`/api/jobs/${route.params.id}/responses`, { method: 'POST', body: { message: message.value } })
    await navigateTo(`/workspaces/${ws.id}`)
  } catch (e) { error.value = apiError(e) }
}
async function setStatus(status: string) {
  error.value = ''
  try { await api(`/api/jobs/${route.params.id}/status`, { method: 'PATCH', body: { status } }); await load() } catch (e) { error.value = apiError(e) }
}
</script>
<template>
  <div v-if="data">
    <div class="card">
      <div class="row">
        <h1 style="margin: 0">{{ data.job.title }}</h1>
        <span class="tag">{{ data.job.category }}</span>
        <span class="tag grey">{{ data.job.selected_contractor_id ? 'awarded' : data.job.status }}</span>
      </div>
      <p>{{ data.job.description }}</p>
      <div class="small muted">{{ data.job.region }} · {{ data.job.urgency }} urgency · posted by {{ data.job.client_name }}</div>
      <div v-if="data.is_owner" class="small" style="margin-top: 0.5rem">
        Indicative budget (only you see this): <b><Money :value="data.job.indicative_budget" /></b>
      </div>
      <div v-if="data.is_owner && !data.job.selected_contractor_id" class="row" style="margin-top: 0.75rem">
        <button v-if="data.job.status === 'open'" class="btn secondary small" @click="setStatus('dormant')">Make dormant</button>
        <button v-if="data.job.status === 'dormant'" class="btn secondary small" @click="setStatus('open')">Reopen</button>
        <button v-if="data.job.status !== 'closed'" class="btn danger small" @click="setStatus('closed')">Close job</button>
      </div>
    </div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="data.is_owner" class="card">
      <h3>Workspaces with candidates</h3>
      <p v-if="!data.workspaces.length" class="muted small">No contractor has responded yet.</p>
      <table v-else>
        <thead><tr><th>Contractor</th><th>Stage</th><th>Outcome</th></tr></thead>
        <tbody><tr v-for="w in data.workspaces" :key="w.id">
          <td><NuxtLink :to="`/workspaces/${w.id}`">{{ w.contractor_name }}</NuxtLink></td>
          <td>{{ w.stage.replace('_', ' ') }}</td><td>{{ w.outcome.replaceAll('_', ' ') }}</td>
        </tr></tbody>
      </table>
    </div>

    <div v-else-if="data.workspaces.length" class="card">
      You are in a workspace for this job: <NuxtLink :to="`/workspaces/${data.workspaces[0].id}`">open it</NuxtLink>
    </div>
    <form v-else-if="canRespond" class="card" @submit.prevent="respond">
      <h3>Respond to this job</h3>
      <label for="msg">Introduce yourself (optional)</label>
      <textarea id="msg" v-model="message" />
      <button class="btn accent" type="submit" data-test="respond">Respond and open a workspace</button>
    </form>
  </div>
</template>
