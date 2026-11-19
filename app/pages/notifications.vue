<script setup lang="ts">
// Transactional notifications (§10, §11).
const api = useApi()
const list = ref<any[]>([])
async function load() { list.value = await api('/api/notifications'); await refreshMe() }
onMounted(load)
async function open(n: any) { if (!n.read_at) await api(`/api/notifications/${n.id}/read`, { method: 'POST' }); if (n.link) await navigateTo(n.link); else await load() }
async function readAll() { await api('/api/notifications/all/read', { method: 'POST' }); await load() }
</script>
<template>
  <div>
    <div class="row"><span class="spacer" /><button v-if="list.some((n) => !n.read_at)" class="btn secondary small" @click="readAll">Mark all read</button></div>
    <div class="card">
      <p v-if="!list.length" class="muted">No notifications.</p>
      <div v-for="n in list" :key="n.id" class="row small" style="border-bottom: 1px solid var(--line); padding: 0.4rem 0; cursor: pointer" @click="open(n)">
        <span :style="{ fontWeight: n.read_at ? 'normal' : 'bold' }">{{ n.title }}</span>
        <span v-if="n.body" class="muted">{{ n.body }}</span><span class="spacer" />
        <span class="muted">{{ new Date(n.created_at).toLocaleString() }}</span>
      </div>
    </div>
  </div>
</template>
