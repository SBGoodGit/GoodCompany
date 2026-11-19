<script setup lang="ts">
// Dashboard (§11): negotiations, contracts with escrow snapshot, deadlines, Community Bank, notifications.
const api = useApi()
const me = useMe()
const d = ref<any>(null)
onMounted(async () => { d.value = await api('/api/dashboard') })
const label = (s: string) => s.replaceAll('_', ' ')
</script>
<template>
  <div v-if="d">
    <div class="row"><h2 class="section-title">Welcome, {{ me?.profile.display_name }}</h2><span class="spacer" />
      <span class="small">Your balance: <b>{{ fmtMoney(d.my_simulated_balance) }}</b> <span class="simulated">SIMULATED</span></span></div>
    <div v-if="d.deadlines.length" class="card" data-test="deadlines">
      <h3>Deadlines</h3>
      <table class="small"><tbody>
        <tr v-for="(x, i) in d.deadlines" :key="i">
          <td><span class="tag" :class="{ orange: x.kind === 'case' }">{{ x.kind === 'case' ? 'case' : 'delivery to respond to' }}</span></td>
          <td><NuxtLink :to="x.kind === 'case' ? (me?.user.role === 'mediator' ? `/mediator/cases/${x.dispute_id}` : `/disputes/${x.dispute_id}`) : `/contracts/${x.contract_id}`">{{ x.title }}</NuxtLink></td>
          <td>{{ x.kind === 'case' ? 'mediator period until' : 'response window until' }} {{ x.due?.slice(0, 10) }} <span class="muted">({{ countdown(x.due) }})</span></td>
          <td class="muted">{{ x.deadline ? `payment deadline ${x.deadline.slice(0, 10)}` : '' }}</td>
        </tr>
      </tbody></table>
    </div>
    <div class="grid2">
      <div class="card">
        <h3>Active negotiations ({{ d.workspaces.length }})</h3>
        <p v-if="!d.workspaces.length" class="muted small">None.</p>
        <div v-for="w in d.workspaces" :key="w.id" class="small"><NuxtLink :to="`/workspaces/${w.id}`">{{ w.title }}</NuxtLink> — {{ label(w.stage) }}</div>
      </div>
      <div class="card">
        <h3>Contracts ({{ d.contracts.length }}) <span class="simulated">SIMULATED</span></h3>
        <p v-if="!d.contracts.length" class="muted small">None.</p>
        <div v-for="c in d.contracts" :key="c.id" class="small">
          <NuxtLink :to="`/contracts/${c.id}`">{{ c.title }}</NuxtLink> — <span class="tag">{{ label(c.status) }}</span>
          <span v-if="c.my_party === 'contractor' && c.status !== 'awaiting_funding'" class="muted"> · in escrow {{ fmtMoney(Number(c.in_escrow), c.currency) }}</span>
          <span v-if="Number(c.disputed)" class="simulated"> · disputed {{ fmtMoney(Number(c.disputed), c.currency) }}</span>
        </div>
      </div>
      <div class="card">
        <h3>Community Bank <span class="simulated">SIMULATED</span></h3>
        <div class="small">Reserves: <b>{{ fmtMoney(d.community_bank.reserves) }}</b></div>
        <div class="small">Community Health Score: {{ d.community_bank.health_score ?? '—' }}</div>
        <div v-if="d.community_bank.pending_votes" class="small"><NuxtLink to="/community-bank">{{ d.community_bank.pending_votes }} loan vote(s) waiting for you</NuxtLink></div>
      </div>
      <div class="card">
        <div class="row"><h3 style="margin: 0">Latest notifications</h3><span class="spacer" /><NuxtLink to="/notifications" class="small">All</NuxtLink></div>
        <p v-if="!d.notifications.length" class="muted small">No notifications.</p>
        <div v-for="n in d.notifications" :key="n.id" class="small" :style="{ fontWeight: n.read_at ? 'normal' : 'bold' }">
          <NuxtLink v-if="n.link" :to="n.link">{{ n.title }}</NuxtLink><span v-else>{{ n.title }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
