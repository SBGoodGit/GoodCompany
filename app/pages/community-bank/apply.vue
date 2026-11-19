<script setup lang="ts">
const api = useApi()
const f = reactive({ purpose_category: 'equipment', purpose: '', amount_requested: '', repayment_term_months: 12, projected_income: '', supplier_email: '' })
const error = ref('')
async function submit() {
  error.value = ''
  try { const l = await api('/api/loan-applications', { method: 'POST', body: f }); await navigateTo(`/community-bank/loans/${l.id}`) } catch (e) { error.value = apiError(e) }
}
</script>
<template>
  <form class="card" @submit.prevent="submit">
    
    <p class="small muted">The loan money goes to your supplier through a sub-escrow, never to you. Interest: 4%, plus 0.25% per 6 months beyond 12 months (at most +3%). Early repayment is always allowed without penalty. A random sample of members votes.</p>
    <p class="small simulated">Simulated: no real money moves in MVP1.</p>
    <div class="grid2">
      <div><label for="l-cat">Purpose</label><select id="l-cat" v-model="f.purpose_category"><option value="equipment">Equipment</option><option value="inventory">Inventory</option><option value="transport">Transport</option><option value="software">Software</option></select></div>
      <div><label for="l-amount">Amount (EUR)</label><input id="l-amount" v-model="f.amount_requested" inputmode="decimal" required /></div>
      <div><label for="l-term">Repayment term (months)</label><input id="l-term" v-model.number="f.repayment_term_months" type="number" min="1" max="120" /></div>
      <div><label for="l-income">Projected income (optional)</label><input id="l-income" v-model="f.projected_income" inputmode="decimal" /></div>
      <div><label for="l-supplier">Supplier email (verified GoodCompany account)</label><input id="l-supplier" v-model="f.supplier_email" type="email" required /></div>
    </div>
    <label for="l-purpose">What will you buy, and why?</label><textarea id="l-purpose" v-model="f.purpose" required />
    <div v-if="error" class="error">{{ error }}</div>
    <button class="btn accent" type="submit" style="margin-top: 0.5rem">Submit for community vote</button>
  </form>
</template>
