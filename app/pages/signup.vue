<script setup lang="ts">
// Email sign-up. A verified email address is the MVP1 identity (§7.6); until the link in the
// email is opened the account cannot sign in. Mediator and admin roles are never self-selected.
const { $supabase } = useNuxtApp()
const form = reactive({ email: '', password: '', display_name: '', role: 'client' })
const error = ref('')
const sent = ref(false)
const busy = ref(false)

async function submit() {
  busy.value = true
  error.value = ''
  const { error: e } = await $supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: { data: { display_name: form.display_name, role: form.role }, emailRedirectTo: `${location.origin}/login` },
  })
  busy.value = false
  if (e) error.value = e.message
  else sent.value = true
}
</script>
<template>
  <div class="card" style="max-width: 460px; margin: 0 auto">
    <h1>Create an account</h1>
    <div v-if="sent" class="info" data-test="check-email">
      Check your inbox: open the link we sent to <b>{{ form.email }}</b> to verify your email address, then sign in.
    </div>
    <form v-else @submit.prevent="submit">
      <label for="name">Name or company name</label>
      <input id="name" v-model="form.display_name" required />
      <label for="email">Email</label>
      <input id="email" v-model="form.email" type="email" autocomplete="email" required />
      <label for="password">Password (at least 8 characters)</label>
      <input id="password" v-model="form.password" type="password" minlength="8" autocomplete="new-password" required />
      <label for="role">I want to</label>
      <select id="role" v-model="form.role">
        <option value="client">Post jobs (client)</option>
        <option value="contractor">Do jobs (contractor)</option>
        <option value="both">Both</option>
      </select>
      <div v-if="error" class="error">{{ error }}</div>
      <button class="btn" style="margin-top: 1rem" type="submit" :disabled="busy">Create account</button>
    </form>
  </div>
</template>
