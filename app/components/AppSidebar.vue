<script setup lang="ts">
// Sidebar of the work environment (step A), after the showcase: module groups, active page,
// role entries for Mediator and admin, greyed "Coming later" modules.
defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()
const me = useMe()
const route = useRoute()

interface Item { to: string; label: string; icon: string; match: string[]; sub?: boolean; test: string }
const items = computed<Item[]>(() => {
  const role = me.value?.user.role
  const list: Item[] = [
    { to: '/dashboard', label: 'Dashboard', icon: '◆', match: ['/dashboard'], test: 'dashboard' },
    { to: '/jobs', label: 'Marketplace', icon: '▤', match: ['/jobs'], test: 'marketplace' },
    { to: '/workspaces', label: 'GoodTrade', icon: '⇄', match: [], test: 'goodtrade' },
    { to: '/workspaces', label: 'Workspaces', icon: '', match: ['/workspaces'], sub: true, test: 'workspaces' },
    { to: '/contracts', label: 'Contracts', icon: '', match: ['/contracts', '/disputes'], sub: true, test: 'contracts' },
    { to: '/contacts', label: 'Contacts', icon: '◔', match: ['/contacts'], test: 'contacts' },
    { to: '/community-bank', label: 'Community Bank', icon: '◈', match: ['/community-bank'], test: 'community-bank' },
    { to: '/invoices', label: 'Invoices', icon: '▧', match: ['/invoices'], test: 'invoices' },
    { to: '/profile', label: 'Profile', icon: '●', match: ['/profile', '/users'], test: 'profile' },
  ]
  if (role === 'mediator') list.push({ to: '/mediator', label: 'Cases', icon: '⚖', match: ['/mediator'], test: 'cases' })
  if (role === 'admin') list.push({ to: '/admin', label: 'Admin', icon: '⚙', match: ['/admin'], test: 'admin' })
  return list
})
const soon = [
  { label: 'Dispute Center', icon: '!' },
  { label: 'Innovation Fund', icon: '✦' },
  { label: 'Plugin Marketplace', icon: '▣' },
  { label: 'AVI identity', icon: '◎' },
  { label: 'Bank link', icon: '⌁' },
]
const isActive = (i: Item) => i.match.some((m) => route.path === m || route.path.startsWith(m + '/'))
watch(() => route.fullPath, () => emit('close'))
</script>

<template>
  <nav class="sidebar" :class="{ open }" data-test="sidebar" aria-label="Modules">
    <NuxtLink to="/dashboard" class="brand"><div class="mark">GC</div><div class="txt"><span>GoodCompany</span><small>MVP 1</small></div></NuxtLink>
    <div class="navgroup-title">Modules</div>
    <NuxtLink v-for="i in items" :key="i.test" :to="i.to" class="navitem" :class="{ active: isActive(i), sub: i.sub }" :data-test="`nav-${i.test}`">
      <span v-if="!i.sub" class="ic">{{ i.icon }}</span>{{ i.label }}
    </NuxtLink>
    <div class="navgroup-title">Coming later</div>
    <button v-for="s in soon" :key="s.label" class="navitem disabled" disabled type="button" :data-test="`soon-${s.label}`">
      <span class="ic">{{ s.icon }}</span>{{ s.label }}<span class="soon-tag">SOON</span>
    </button>
  </nav>
</template>
