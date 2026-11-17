<script setup lang="ts">
// Basic dashboard (fuller version in session 3): open negotiations, contracts, notifications.
const api = useApi()
const me = useMe()
const workspaces = ref<any[]>([])
const contracts = ref<any[]>([])
const notifications = ref<any[]>([])
async function load() {
  ;[workspaces.value, contracts.value, notifications.value] = await Promise.all([
    api('/api/workspaces'), api('/api/contracts'), api('/api/notifications'),
  ])
}
async function readAll() { await api('/api/notifications/all/read', { method: 'POST' }); await load(); await refreshMe() }
onMounted(load)
const active = computed(() => workspaces.value.filter((w) => w.stage !== 'closed'))
</script>
<template>
  <div>
    <h1>Welcome, {{ me?.profile.display_name }}</h1>
    <div class="grid2">
      <div class="card">
        <h3>Active negotiations ({{ active.length }})</h3>
        <p v-if="!active.length" class="muted small">None yet.</p>
        <div v-for="w in active" :key="w.id" class="small">
          <NuxtLink :to="`/workspaces/${w.id}`">{{ w.job_title }}</NuxtLink>
          — {{ w.stage.replace('_', ' ') }} with {{ w.other_party_name }}
        </div>
      </div>
      <div class="card">
        <h3>Contracts ({{ contracts.length }})</h3>
        <p v-if="!contracts.length" class="muted small">None yet.</p>
        <div v-for="c in contracts" :key="c.id" class="small">
          <NuxtLink :to="`/contracts/${c.id}`">{{ c.job_title }}</NuxtLink>
          — <span class="tag">{{ c.status.replace('_', ' ') }}</span>
        </div>
      </div>
    </div>
    <div class="card">
      <div class="row"><h3>Notifications</h3><span class="spacer" /><button v-if="notifications.some((n) => !n.read_at)" class="btn secondary small" @click="readAll">Mark all read</button></div>
      <p v-if="!notifications.length" class="muted small">No notifications.</p>
      <div v-for="n in notifications" :key="n.id" class="small" :style="{ fontWeight: n.read_at ? 'normal' : 'bold' }">
        <NuxtLink v-if="n.link" :to="n.link">{{ n.title }}</NuxtLink><span v-else>{{ n.title }}</span>
        <span class="muted"> · {{ new Date(n.created_at).toLocaleString() }}</span>
        <div v-if="n.body" class="muted" style="font-weight: normal">{{ n.body }}</div>
      </div>
    </div>
  </div>
</template>
