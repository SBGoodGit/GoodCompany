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
      <div v-if="data.is_owner && !data.job.selected_contractor_id && data.job.status !== 'closed'" class="row" style="margin-top: 0.75rem">
        <label class="inline-check" data-test="pause-applicants">
          <input type="checkbox" :checked="data.job.status === 'dormant'" @change="setStatus(($event.target as HTMLInputElement).checked ? 'dormant' : 'open')" />
          Pause new applicants
        </label>
        <span class="small muted">{{ data.job.status === 'dormant' ? 'No new contractors can respond. Existing conversations continue.' : 'Contractors can respond to this job.' }}</span>
        <span class="spacer" />
        <button class="btn danger small" @click="setStatus('closed')">Close job</button>
      </div>
    </div>
    <div v-if="error" class="error">{{ error }}</div>

    <div v-if="data.is_owner" class="card" data-test="conversations">
      <h3>Conversations</h3>
      <p v-if="data.candidates" class="small muted">
        Introductions are unlimited. Past the introduction: {{ data.candidates.active }} of {{ data.candidates.limit }} candidates
        (technical intake, terms or quote) · swaps used {{ data.candidates.swaps_used }} of {{ data.candidates.swaps_max }}.
        You move a candidate into the technical intake from their conversation.
      </p>
      <p v-if="!data.workspaces.length" class="muted small">No contractor has responded yet.</p>
      <table v-else>
        <thead><tr><th>Contractor</th><th>Stage</th><th>Last activity</th><th /></tr></thead>
        <tbody><tr v-for="w in data.workspaces" :key="w.id" :data-test="`conversation-${w.contractor_name}`">
          <td>{{ w.contractor_name }}</td>
          <td><span class="tag" :class="{ grey: w.stage === 'closed' }">{{ w.stage === 'closed' ? w.outcome.replaceAll('_', ' ') : w.stage.replace('_', ' ') }}</span></td>
          <td class="small">{{ new Date(w.last_activity_at).toLocaleString() }}</td>
          <td><NuxtLink class="btn secondary small" :to="`/workspaces/${w.id}`">Open</NuxtLink></td>
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
