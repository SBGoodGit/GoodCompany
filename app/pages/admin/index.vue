<script setup lang="ts">
// Admin (session 1 scope): Mediator accounts and Mediator assignment (P15).
// Full settings editing and simulated balances follow in session 3.
const api = useApi()
const d = ref<any>({ mediators: [], default_mediator_id: null })
const form = reactive({ email: '', display_name: '', password: '' })
const assign = reactive({ workspace_id: '', mediator_id: '' })
const error = ref('')
const msg = ref('')
async function load() { d.value = await api('/api/admin/mediators') }
onMounted(load)
async function run(fn: () => Promise<any>, ok: string) { error.value = ''; msg.value = ''; try { await fn(); msg.value = ok; await load() } catch (e) { error.value = apiError(e) } }
const create = () => run(async () => { await api('/api/admin/mediators', { method: 'POST', body: form }); Object.assign(form, { email: '', display_name: '', password: '' }) }, 'Mediator account created')
const setDefault = (id: string | null) => run(() => api('/api/admin/settings/default_mediator_id', { method: 'PUT', body: { value: id } }), 'Default Mediator set')
const assignWs = () => run(() => api(`/api/admin/workspaces/${assign.workspace_id}/mediator`, { method: 'POST', body: { mediator_id: assign.mediator_id } }), 'Mediator assigned')
</script>
<template>
  <div>
    <h1>Admin</h1>
    <div v-if="error" class="error">{{ error }}</div><div v-if="msg" class="info">{{ msg }}</div>
    <div class="card">
      <h3>Mediators</h3>
      <p class="small muted">The default Mediator is assigned to new terms versions. Parties accept the Mediator by accepting the terms.</p>
      <table><thead><tr><th>Name</th><th>Email</th><th>Default</th></tr></thead>
        <tbody><tr v-for="m in d.mediators" :key="m.id"><td>{{ m.display_name }}</td><td>{{ m.email }}</td>
          <td><span v-if="m.id === d.default_mediator_id" class="tag">default</span><button v-else class="btn secondary small" @click="setDefault(m.id)">Make default</button></td></tr></tbody>
      </table>
    </div>
    <div class="grid2">
      <form class="card" @submit.prevent="create">
        <h3>Create a Mediator account</h3>
        <label for="m-name">Name</label><input id="m-name" v-model="form.display_name" required />
        <label for="m-email">Email</label><input id="m-email" v-model="form.email" type="email" required />
        <label for="m-pw">Initial password</label><input id="m-pw" v-model="form.password" type="password" minlength="8" required />
        <button class="btn" type="submit" style="margin-top: 0.5rem">Create</button>
      </form>
      <form class="card" @submit.prevent="assignWs">
        <h3>Assign a Mediator to a workspace</h3>
        <label for="a-ws">Workspace id</label><input id="a-ws" v-model="assign.workspace_id" required />
        <label for="a-m">Mediator</label><select id="a-m" v-model="assign.mediator_id" required><option v-for="m in d.mediators" :key="m.id" :value="m.id">{{ m.display_name }}</option></select>
        <button class="btn" type="submit" style="margin-top: 0.5rem">Assign</button>
      </form>
    </div>
  </div>
</template>
