<script setup lang="ts">
const api = useApi()
const d = ref<any>(null)
const categories = ref<any[]>([])
const form = reactive<any>({})
const item = reactive({ title: '', description: '', media_urls: '' })
const msg = ref('')
const error = ref('')
async function load() {
  d.value = await api('/api/profile')
  Object.assign(form, { display_name: d.value.profile.display_name, description: d.value.profile.description, region: d.value.profile.region,
    account_type: d.value.profile.account_type, expertise_tags: [...d.value.profile.expertise_tags], phone: d.value.user.phone ?? '', role: d.value.user.role })
}
onMounted(async () => { categories.value = await api('/api/categories'); await load() })
async function save() {
  error.value = ''; msg.value = ''
  try { await api('/api/profile', { method: 'PATCH', body: form }); await refreshMe(); await load(); msg.value = 'Profile saved' } catch (e) { error.value = apiError(e) }
}
async function addItem() {
  try { await api('/api/portfolio', { method: 'POST', body: { ...item, media_urls: item.media_urls.split(/\s+/).filter(Boolean) } }); Object.assign(item, { title: '', description: '', media_urls: '' }); await load() } catch (e) { error.value = apiError(e) }
}
async function delItem(id: string) { await api(`/api/portfolio/${id}`, { method: 'DELETE' }); await load() }
const selfRoles = computed(() => ['client', 'contractor', 'both'].includes(d.value?.user.role))
</script>
<template>
  <div v-if="d">
    <div class="row"><h1 style="margin: 0">My profile</h1><span class="spacer" /><NuxtLink :to="`/users/${d.user.id}`">View public profile</NuxtLink></div>
    <form class="card" @submit.prevent="save">
      <div class="grid2">
        <div><label for="p-name">Display name</label><input id="p-name" v-model="form.display_name" /></div>
        <div><label for="p-type">Account type</label><select id="p-type" v-model="form.account_type"><option value="individual">Individual</option><option value="company">Company</option></select></div>
        <div><label for="p-region">Region</label><input id="p-region" v-model="form.region" /></div>
        <div><label for="p-phone">Phone</label><input id="p-phone" v-model="form.phone" /></div>
        <div v-if="selfRoles"><label for="p-role">Role</label><select id="p-role" v-model="form.role"><option value="client">Client</option><option value="contractor">Contractor</option><option value="both">Both</option></select></div>
      </div>
      <label for="p-desc">Description</label><textarea id="p-desc" v-model="form.description" />
      <label>Expertise (drives "search only within my expertise")</label>
      <div class="row small"><label v-for="c in categories" :key="c.key" class="inline-check"><input v-model="form.expertise_tags" type="checkbox" :value="c.key" :data-test="`expertise-${c.key}`" /> {{ c.name }}</label></div>
      <p class="small muted">Identity: {{ d.user.identity_level === 'email_verified' ? 'email verified' : 'not verified' }} (email: {{ d.user.email }})</p>
      <div v-if="error" class="error">{{ error }}</div><div v-if="msg" class="info">{{ msg }}</div>
      <button class="btn" type="submit" data-test="save-profile">Save profile</button>
    </form>
    <div class="card">
      <h3>Portfolio</h3>
      <div v-for="p in d.portfolio" :key="p.id" class="row small"><b>{{ p.title }}</b><span class="muted">{{ p.description }}</span><span class="spacer" /><button class="btn danger small" @click="delItem(p.id)">Delete</button></div>
      <form @submit.prevent="addItem">
        <div class="grid2"><div><label for="pi-title">Title</label><input id="pi-title" v-model="item.title" required /></div>
          <div><label for="pi-urls">Image or link URLs (space-separated)</label><input id="pi-urls" v-model="item.media_urls" /></div></div>
        <label for="pi-desc">Description</label><textarea id="pi-desc" v-model="item.description" />
        <button class="btn secondary" type="submit">Add portfolio item</button>
      </form>
    </div>
  </div>
</template>
