<script setup lang="ts">
const session = useState<any>('session')
if (session.value) await navigateTo('/dashboard')
</script>
<template>
  <div class="card">
    <h1>GoodCompany</h1>
    <p>Find work or contractors, agree terms in a Negotiation Workspace, and sign a contract.</p>
    <p class="simulated">MVP1: all balances and payments are simulated. No real money moves.</p>
    <div class="row">
      <NuxtLink class="btn" to="/signup">Create an account</NuxtLink>
      <NuxtLink class="btn secondary" to="/login">Sign in</NuxtLink>
    </div>
  </div>
</template>
