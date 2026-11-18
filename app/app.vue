<script setup lang="ts">
// Step A: signed-in pages live in the work environment of the showcase (sidebar, top bar, page heading);
// the public pages (start, sign in, sign up) stay outside it.
const route = useRoute()
const me = useMe()
const PUBLIC = ['/', '/login', '/signup']
const inShell = computed(() => !PUBLIC.includes(route.path) && !!me.value)
const meta = usePageMeta()
const sidebarOpen = ref(false)
useHead(() => ({ title: inShell.value ? `${meta.value.title} · GoodCompany` : 'GoodCompany' }))
</script>

<template>
  <div v-if="inShell" class="shell">
    <AppSidebar :open="sidebarOpen" @close="sidebarOpen = false" />
    <div class="scrim" :class="{ open: sidebarOpen }" @click="sidebarOpen = false" />
    <div class="main">
      <AppTopbar @menu="sidebarOpen = !sidebarOpen" />
      <div class="page-heading" data-test="page-heading">
        <h1>{{ meta.title }}</h1>
        <div v-if="meta.sub" class="sub">{{ meta.sub }}</div>
      </div>
      <main class="container"><NuxtPage /></main>
    </div>
    <StepUpDialog />
  </div>
  <div v-else class="public">
    <NuxtLink to="/" class="brand"><div class="mark">GC</div><div class="txt"><span>GoodCompany</span><small>MVP 1</small></div></NuxtLink>
    <main class="panel" :class="{ wide: route.path === '/' }"><NuxtPage /></main>
    <StepUpDialog />
  </div>
</template>
