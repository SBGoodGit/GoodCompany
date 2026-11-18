<script setup lang="ts">
// Admin (§11, §12): configuration values, Mediator accounts and assignment, simulated balances,
// Community Bank (reserve seed, manual loan default) and the system jobs.
const api = useApi()
const d = ref<any>({ mediators: [], default_mediator_id: null })
const settings = ref<any[]>([])
const edits = reactive<Record<string, string>>({})
const jobs = ref<any[]>([])
const loans = ref<any[]>([])
const form = reactive({ email: '', display_name: '', password: '' })
const assign = reactive({ workspace_id: '', mediator_id: '' })
const contractAssign = reactive({ contract_id: '', mediator_id: '' })
const balance = reactive({ email: '', amount: '' })
const seed = reactive({ reserve: 'credit', amount: '' })
const error = ref('')
const msg = ref('')
const FIXED = new Set(['holdback_percentage'])

async function load() {
  ;[d.value, settings.value, jobs.value, loans.value] = await Promise.all([
    api('/api/admin/mediators'), api('/api/admin/settings'), api('/api/admin/system/jobs'), api('/api/admin/loans'),
  ])
  for (const s of settings.value) edits[s.key] = JSON.stringify(s.value)
}
onMounted(load)
async function run(fn: () => Promise<any>, ok: string) {
  error.value = ''; msg.value = ''
  try { const r = await fn(); msg.value = typeof r === 'string' ? r : ok; await load() } catch (e) { error.value = apiError(e) }
}
const saveSetting = (key: string) => run(async () => {
  let value: unknown
  try { value = JSON.parse(edits[key]) } catch { throw { data: { statusMessage: 'Enter valid JSON (numbers as 14, text in "quotes", lists as [1,2])' } } }
  await api(`/api/admin/settings/${key}`, { method: 'PUT', body: { value } })
}, `Saved ${key}`)
const create = () => run(async () => { await api('/api/admin/mediators', { method: 'POST', body: form }); Object.assign(form, { email: '', display_name: '', password: '' }) }, 'Mediator account created')
const setDefault = (id: string | null) => run(() => api('/api/admin/settings/default_mediator_id', { method: 'PUT', body: { value: id } }), 'Default Mediator set')
const assignWs = () => run(() => api(`/api/admin/workspaces/${assign.workspace_id}/mediator`, { method: 'POST', body: { mediator_id: assign.mediator_id } }), 'Mediator assigned to workspace')
const assignContract = () => run(() => api(`/api/admin/contracts/${contractAssign.contract_id}/mediator`, { method: 'POST', body: { mediator_id: contractAssign.mediator_id } }), 'Mediator assigned to contract')
const credit = () => run(() => api('/api/admin/simulated-balances', { method: 'POST', body: balance }), 'Simulated balance added')
const seedReserve = () => run(() => api('/api/admin/reserves/seed', { method: 'POST', body: seed }), 'Simulated seed added to the reserve')
const checkNote = reactive<Record<string, string>>({})
const checkLoan = (id: string, decision: 'approve' | 'return') => run(
  () => api(`/api/admin/loans/${id}/check`, { method: 'POST', body: { decision, note: checkNote[id] ?? '' } }),
  decision === 'approve' ? 'Application approved; the vote has started' : 'Application returned to the applicant')
const pendingLoans = computed(() => loans.value.filter((l) => l.status === 'admin_check'))
const markDefault = (id: string) => { if (confirm('Mark this loan as defaulted?')) run(() => api(`/api/admin/loans/${id}/default`, { method: 'POST' }), 'Loan marked defaulted') }
const runJob = (job: string) => run(async () => {
  const r: any = await api('/api/admin/system/run-job', { method: 'POST', body: { job } })
  return job === 'all' ? 'All jobs ran' : `${job}: ${JSON.stringify(r.result ?? r.error)}`
}, '')
</script>

<template>
  <div>
    
    <div v-if="error" class="error" data-test="error">{{ error }}</div><div v-if="msg" class="info" data-test="notice">{{ msg }}</div>

    <div class="card">
      <div class="row"><h3 style="margin: 0">System jobs</h3><span class="spacer" /><button class="btn secondary small" data-test="run-all-jobs" @click="runJob('all')">Run all now</button></div>
      <p class="small muted">Run automatically every 5 minutes when due. Idempotent: running again is safe. Jobs open cases and send notices; they never pay out.</p>
      <table class="small"><tbody>
        <tr v-for="j in jobs" :key="j.name">
          <td>{{ j.label }}</td>
          <td class="muted">{{ j.last ? new Date(j.last.started_at).toLocaleString() : 'never' }}</td>
          <td class="muted" style="max-width: 320px; overflow: hidden">{{ j.last?.error ?? (j.last?.result ? JSON.stringify(j.last.result) : '') }}</td>
          <td><button class="btn secondary small" :data-test="`run-${j.name}`" @click="runJob(j.name)">Run</button></td>
        </tr>
      </tbody></table>
    </div>

    <div class="card">
      <h3>Mediators</h3>
      <p class="small muted">The default Mediator is assigned to new terms versions. Parties accept the Mediator by accepting the terms.</p>
      <table class="small"><thead><tr><th>Name</th><th>Email</th><th>Id</th><th>Default</th></tr></thead>
        <tbody><tr v-for="m in d.mediators" :key="m.id"><td>{{ m.display_name }}</td><td>{{ m.email }}</td><td><code>{{ m.id }}</code></td>
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
      <div class="card">
        <form @submit.prevent="assignWs">
          <h3>Assign a Mediator to a workspace</h3>
          <label for="a-ws">Workspace id</label><input id="a-ws" v-model="assign.workspace_id" required />
          <label for="a-m">Mediator</label><select id="a-m" v-model="assign.mediator_id" required><option v-for="m in d.mediators" :key="m.id" :value="m.id">{{ m.display_name }}</option></select>
          <button class="btn" type="submit" style="margin-top: 0.5rem">Assign</button>
        </form>
        <form @submit.prevent="assignContract">
          <h3>Assign a Mediator to a contract</h3>
          <p class="small muted">Only while no Mediator is active on a case. Afterwards the parties replace the Mediator together.</p>
          <label for="ac-id">Contract id</label><input id="ac-id" v-model="contractAssign.contract_id" required />
          <label for="ac-m">Mediator</label><select id="ac-m" v-model="contractAssign.mediator_id" required><option v-for="m in d.mediators" :key="m.id" :value="m.id">{{ m.display_name }}</option></select>
          <button class="btn" type="submit" style="margin-top: 0.5rem">Assign</button>
        </form>
      </div>
    </div>

    <div class="grid2">
      <form class="card" @submit.prevent="credit">
        <h3>Simulated user balance</h3>
        <p class="small simulated">Demonstration money only. It has no relation to real money.</p>
        <label for="b-email">User email</label><input id="b-email" v-model="balance.email" type="email" required />
        <label for="b-amount">Amount to add</label><input id="b-amount" v-model="balance.amount" inputmode="decimal" required />
        <button class="btn" type="submit" style="margin-top: 0.5rem">Add simulated balance</button>
      </form>
      <form class="card" @submit.prevent="seedReserve">
        <h3>Simulated reserve seed</h3>
        <p class="small simulated">Demonstration money for the Community Bank reserves (recorded as simulated seed).</p>
        <label for="r-res">Reserve</label><select id="r-res" v-model="seed.reserve"><option value="safety">Safety</option><option value="credit">Credit</option><option value="legal">Legal</option><option value="innovation">Innovation</option></select>
        <label for="r-amount">Amount</label><input id="r-amount" v-model="seed.amount" inputmode="decimal" required />
        <button class="btn" type="submit" style="margin-top: 0.5rem">Add to reserve</button>
      </form>
    </div>

    <div class="card small" data-test="loan-checks">
      <h3>Loan applications: administrative check</h3>
      <p class="muted">Check completeness, required data and formal conditions only (OD5). Never judge whether the loan is desirable or how members should vote. Returning requires a reason.</p>
      <p v-if="!pendingLoans.length" class="muted">No applications waiting.</p>
      <div v-for="l in pendingLoans" :key="l.id" class="card" :data-test="`loan-check-${l.id}`">
        <div><b>{{ l.purpose_category }}</b> · {{ fmtMoney(l.amount_requested) }} · {{ l.repayment_term_months }} months at {{ l.interest_rate }}% · applicant {{ l.applicant }} · supplier {{ l.supplier }}</div>
        <div>{{ l.purpose }}</div>
        <div v-if="l.projected_income" class="muted">Projected income: {{ fmtMoney(l.projected_income) }}</div>
        <label :for="`note-${l.id}`">Reason or note (required to return)</label><input :id="`note-${l.id}`" v-model="checkNote[l.id]" data-test="loan-check-note" />
        <div class="row" style="margin-top: 0.5rem">
          <button class="btn small" data-test="loan-check-approve" @click="checkLoan(l.id, 'approve')">Approve for voting</button>
          <button class="btn secondary small" data-test="loan-check-return" @click="checkLoan(l.id, 'return')">Return to applicant</button>
        </div>
      </div>
    </div>

    <div class="card small">
      <h3>Loans</h3>
      <p class="muted">No automated default detection in MVP1: an admin marks a loan defaulted by hand.</p>
      <p v-if="!loans.length" class="muted">No loan applications.</p>
      <table v-else><tbody><tr v-for="l in loans" :key="l.id"><td>{{ l.applicant }}</td><td>{{ l.purpose_category }}</td><td>{{ fmtMoney(l.amount_requested) }}</td><td>{{ l.status }}</td>
        <td>{{ l.status === 'active' ? `outstanding ${fmtMoney(l.principal_outstanding)}` : '' }}</td>
        <td><button v-if="l.status === 'active'" class="btn danger small" @click="markDefault(l.id)">Mark defaulted</button></td></tr></tbody></table>
    </div>

    <div class="card small" data-test="settings">
      <h3>Configuration (§12)</h3>
      <p class="muted">Values are JSON: numbers as 14, text in quotes, lists as [0,15,30,90]. The holdback percentage is fixed by the specification.</p>
      <table><tbody>
        <tr v-for="s in settings" :key="s.key">
          <td><code>{{ s.key }}</code><div class="muted">{{ s.description }}</div></td>
          <td style="width: 40%"><input v-model="edits[s.key]" :disabled="FIXED.has(s.key)" :data-test="`setting-${s.key}`" /></td>
          <td><button v-if="!FIXED.has(s.key)" class="btn secondary small" :data-test="`save-${s.key}`" @click="saveSetting(s.key)">Save</button></td>
        </tr>
      </tbody></table>
    </div>
  </div>
</template>
