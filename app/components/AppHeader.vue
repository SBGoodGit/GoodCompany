<script setup lang="ts">
const me = useMe()
const { $supabase } = useNuxtApp()
async function signOut() {
  await $supabase.auth.signOut()
  me.value = null
  await navigateTo('/login')
}
</script>

<template>
  <header class="app">
    <div class="inner">
      <NuxtLink to="/" class="brand">Good<span>Company</span></NuxtLink>
      <nav v-if="me">
        <NuxtLink to="/dashboard">Dashboard</NuxtLink>
        <NuxtLink to="/jobs">Jobs</NuxtLink>
        <NuxtLink to="/workspaces">Workspaces</NuxtLink>
        <NuxtLink to="/contracts">Contracts</NuxtLink>
        <NuxtLink to="/contacts">Contacts</NuxtLink>
        <NuxtLink to="/profile">Profile</NuxtLink>
        <NuxtLink v-if="me.user.role === 'admin'" to="/admin">Admin</NuxtLink>
      </nav>
      <span class="spacer" />
      <template v-if="me">
        <span class="small muted">{{ me.profile.display_name }} · {{ me.user.role }}</span>
        <button class="btn secondary small" data-test="sign-out" @click="signOut">Sign out</button>
      </template>
    </div>
    <StepUpDialog />
  </header>
</template>
