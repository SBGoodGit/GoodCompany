<script setup lang="ts">
const { $supabase } = useNuxtApp()
const route = useRoute()
const session = useState<any>('session')
const email = ref('')
const password = ref('')
const error = ref('')
const busy = ref(false)

async function done() {
  await refreshMe()
  await navigateTo((route.query.next as string) || '/dashboard')
}
onMounted(() => { if (session.value) done() })

async function submit() {
  busy.value = true
  error.value = ''
  const { error: e } = await $supabase.auth.signInWithPassword({ email: email.value, password: password.value })
  busy.value = false
  if (e) {
    error.value = e.message === 'Email not confirmed' ? 'Verify your email address first: open the link we sent you.' : e.message
    return
  }
  await done()
}
</script>
<template>
  <form class="card" style="max-width: 420px; margin: 0 auto" @submit.prevent="submit">
    <h1>Sign in</h1>
    <label for="email">Email</label>
    <input id="email" v-model="email" type="email" autocomplete="email" required />
    <label for="password">Password</label>
    <input id="password" v-model="password" type="password" autocomplete="current-password" required />
    <div v-if="error" class="error">{{ error }}</div>
    <div class="row" style="margin-top: 1rem">
      <button class="btn" type="submit" :disabled="busy">Sign in</button>
      <NuxtLink to="/signup">Create an account</NuxtLink>
    </div>
  </form>
</template>
