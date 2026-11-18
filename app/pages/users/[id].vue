<script setup lang="ts">
// Public profile with the Rookie Stage rule (§3.1.1): no score before the required number of completed contracts.
const api = useApi()
const route = useRoute()
const p = ref<any>(null)
onMounted(async () => { p.value = await api(`/api/profiles/${route.params.id}`) })
</script>
<template>
  <div v-if="p" class="card">
    <div class="row"><h2 class="section-title">{{ p.display_name }}</h2><span v-for="b in p.badges" :key="b" class="tag">{{ b }}</span><span class="tag grey">{{ p.account_type }}</span></div>
    <p>{{ p.description }}</p>
    <p class="small muted">{{ p.region }} · {{ p.role }}</p>
    <div class="small">Expertise: <span v-for="t in p.expertise_tags" :key="t" class="tag" style="margin-right: 0.25rem">{{ t }}</span></div>
    <p class="small">Completed contracts as contractor: <b>{{ p.completed_as_contractor }}</b></p>
    <p v-if="p.reputation_public" class="small">Reputation as contractor: <b>{{ p.reputation_score_as_contractor ?? '—' }}</b> · satisfied clients {{ p.stats_satisfaction_rate === null ? '—' : Math.round(p.stats_satisfaction_rate * 100) + '%' }}</p>
    <p v-else class="small muted">Rookie Stage: a reputation score is shown after {{ p.rookie_reviews_required }} completed contracts.</p>
    <p class="small">Warranty offered on {{ p.warranty_offered_rate === null ? '—' : Math.round(p.warranty_offered_rate * 100) + '%' }} of completed jobs · average warranty {{ p.warranty_avg_days ?? '—' }} days · warranty periods completed without claim {{ p.warranty_completion_rate === null ? '—' : Math.round(p.warranty_completion_rate * 100) + '%' }}</p>
    <h3>Portfolio</h3>
    <p v-if="!p.portfolio.length" class="muted small">No portfolio items.</p>
    <div v-for="i in p.portfolio" :key="i.id" class="small"><b>{{ i.title }}</b> — {{ i.description }} <a v-for="u in i.media_urls" :key="u" :href="u" target="_blank" rel="noopener">link</a></div>
  </div>
</template>
