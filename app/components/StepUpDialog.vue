<script setup lang="ts">
// Re-enter the password before a signature. The password goes only to /api/auth/step-up,
// which returns a single-use token valid for a few minutes.
const state = useStepUpState()
const api = useApi()
const password = ref('')
const error = ref('')
const busy = ref(false)

async function confirm() {
  busy.value = true
  error.value = ''
  try {
    const r = await api<{ token: string }>('/api/auth/step-up', { method: 'POST', body: { password: password.value } })
    const resolve = state.value.resolve
    state.value = { open: false, title: '', summary: '', resolve: null }
    password.value = ''
    resolve?.(r.token)
  } catch (e) {
    error.value = apiError(e)
  } finally {
    busy.value = false
  }
}
function cancel() {
  const resolve = state.value.resolve
  state.value = { open: false, title: '', summary: '', resolve: null }
  password.value = ''
  error.value = ''
  resolve?.(null)
}
</script>

<template>
  <div v-if="state.open" class="modal-backdrop">
    <form class="modal" data-test="step-up" @submit.prevent="confirm">
      <h3>{{ state.title }}</h3>
      <p class="small">{{ state.summary }}</p>
      <p class="small muted">Confirm it is you: enter your password to sign.</p>
      <label for="stepup-pw">Password</label>
      <input id="stepup-pw" v-model="password" type="password" autocomplete="current-password" autofocus required />
      <div v-if="error" class="error">{{ error }}</div>
      <div class="row" style="margin-top: 1rem">
        <button class="btn" type="submit" :disabled="busy">Confirm and sign</button>
        <button class="btn secondary" type="button" @click="cancel">Cancel</button>
      </div>
    </form>
  </div>
</template>
