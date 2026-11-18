<script setup lang="ts">
// Top bar of the work environment (step A), after the showcase: search (comes later), the SIMULATED label,
// notifications with the unread counter, and the avatar menu. No language switch (English, D3); no tasks
// or quick-add yet (step D).
const emit = defineEmits<{ menu: [] }>()
const me = useMe()
const { $supabase } = useNuxtApp()
const menuOpen = ref(false)
const initials = computed(() => String(me.value?.profile.display_name ?? '?').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join(''))
async function signOut() {
  menuOpen.value = false
  await $supabase.auth.signOut()
  me.value = null
  await navigateTo('/login')
}
const route = useRoute()
watch(() => route.fullPath, () => { menuOpen.value = false })
</script>

<template>
  <header class="topbar">
    <button class="icon-btn menu-btn" type="button" aria-label="Open menu" data-test="menu-button" @click="emit('menu')">☰</button>
    <div class="searchbar" title="Search comes later"><span>⌕</span><input disabled placeholder="Search comes later" aria-label="Search (comes later)" /></div>
    <span class="spacer" />
    <span class="badge-sim">SIMULATED — no real money</span>
    <NuxtLink to="/notifications" class="icon-btn" aria-label="Notifications" data-test="notifications-link">
      🔔<span v-if="me?.unread_notifications" class="count" data-test="unread-count">{{ me.unread_notifications }}</span>
    </NuxtLink>
    <div style="position: relative">
      <button class="avatar" type="button" :aria-expanded="menuOpen" aria-label="Account menu" data-test="avatar" @click="menuOpen = !menuOpen">{{ initials }}</button>
      <div v-if="menuOpen" class="avatar-menu" data-test="avatar-menu">
        <div class="who"><b>{{ me?.profile.display_name }}</b><div class="small muted">{{ me?.user.role }}</div></div>
        <NuxtLink to="/profile">Profile</NuxtLink>
        <button type="button" data-test="sign-out" @click="signOut">Sign out</button>
      </div>
    </div>
  </header>
</template>
