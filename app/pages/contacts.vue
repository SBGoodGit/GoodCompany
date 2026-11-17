<script setup lang="ts">
// Contacts and groups (§3.2). Grey = not on GoodCompany yet, teal = member.
// The collaboration preference is private: only you see it, and it never affects the other person.
const api = useApi()
const d = ref<any>({ contacts: [], groups: [] })
const filter = ref('')
const error = ref('')
const form = reactive({ display_name: '', company_name: '', email: '', phone: '', notes: '' })
const groupName = ref('')
async function load() { d.value = await api('/api/contacts', { query: { group: filter.value } }) }
onMounted(load)
watch(filter, load)
async function run(fn: () => Promise<any>) { error.value = ''; try { await fn(); await load() } catch (e) { error.value = apiError(e) } }
const add = () => run(async () => { await api('/api/contacts', { method: 'POST', body: form }); Object.assign(form, { display_name: '', company_name: '', email: '', phone: '', notes: '' }) })
const addGroup = () => run(async () => { await api('/api/contact-groups', { method: 'POST', body: { name: groupName.value } }); groupName.value = '' })
const delGroup = (id: string) => run(() => api(`/api/contact-groups/${id}`, { method: 'DELETE' }))
const setPref = (c: any, v: string) => run(() => api(`/api/contacts/${c.id}`, { method: 'PATCH', body: { collaboration_preference: v } }))
const toggleGroup = (c: any, gid: string) => run(() => api(`/api/contacts/${c.id}/groups`, { method: 'POST', body: { group_ids: c.group_ids.includes(gid) ? c.group_ids.filter((x: string) => x !== gid) : [...c.group_ids, gid] } }))
const remove = (c: any) => { if (confirm(`Remove ${c.display_name}?`)) run(() => api(`/api/contacts/${c.id}`, { method: 'DELETE' })) }
</script>
<template>
  <div>
    <h1>Contacts</h1>
    <div v-if="error" class="error">{{ error }}</div>
    <div class="grid2">
      <form class="card" @submit.prevent="add">
        <h3>Add a contact</h3>
        <label for="c-name">Name</label><input id="c-name" v-model="form.display_name" required />
        <label for="c-company">Company</label><input id="c-company" v-model="form.company_name" />
        <label for="c-email">Email</label><input id="c-email" v-model="form.email" type="email" />
        <label for="c-phone">Phone</label><input id="c-phone" v-model="form.phone" />
        <label for="c-notes">Notes</label><textarea id="c-notes" v-model="form.notes" />
        <button class="btn" type="submit" style="margin-top: 0.5rem">Add contact</button>
      </form>
      <div class="card">
        <h3>Groups</h3>
        <div v-for="g in d.groups" :key="g.id" class="row small"><span>{{ g.name }}</span><span class="spacer" /><button class="btn danger small" @click="delGroup(g.id)">Delete</button></div>
        <form class="row" style="margin-top: 0.5rem" @submit.prevent="addGroup"><input v-model="groupName" placeholder="New group, e.g. Carpenters" style="flex: 1" /><button class="btn secondary" type="submit">Add</button></form>
        <label for="filter">Show group</label>
        <select id="filter" v-model="filter"><option value="">All contacts</option><option v-for="g in d.groups" :key="g.id" :value="g.id">{{ g.name }}</option></select>
      </div>
    </div>
    <div class="card">
      <p v-if="!d.contacts.length" class="muted">No contacts.</p>
      <table v-else>
        <thead><tr><th>Name</th><th>Details</th><th>Groups</th><th>My private preference</th><th /></tr></thead>
        <tbody><tr v-for="c in d.contacts" :key="c.id">
          <td><span class="tag" :class="{ grey: c.status === 'unlinked' }">{{ c.status === 'linked' ? 'on GoodCompany' : 'not on GoodCompany' }}</span><br />
            <NuxtLink v-if="c.linked_user_id" :to="`/users/${c.linked_user_id}`">{{ c.display_name }}</NuxtLink><span v-else>{{ c.display_name }}</span></td>
          <td class="small">{{ c.company_name }}<div>{{ c.email }}</div><div>{{ c.phone }}</div><div class="muted">{{ c.notes }}</div></td>
          <td class="small"><label v-for="g in d.groups" :key="g.id" class="inline-check"><input type="checkbox" :checked="c.group_ids.includes(g.id)" @change="toggleGroup(c, g.id)" /> {{ g.name }}</label></td>
          <td><select :value="c.collaboration_preference" @change="setPref(c, ($event.target as HTMLSelectElement).value)">
            <option value="none">No preference</option><option value="prefer">Prefer</option><option value="avoid">Avoid</option></select></td>
          <td><button class="btn danger small" @click="remove(c)">Remove</button></td>
        </tr></tbody>
      </table>
    </div>
  </div>
</template>
