<script setup lang="ts">
// Donut chart in plain SVG (no chart library), with a legend showing each share.
interface Segment { label: string; value: number; color: string }
const props = withDefaults(defineProps<{ segments: Segment[]; size?: number }>(), { size: 126 })
const R = 15.9155 // circumference 100
const total = computed(() => props.segments.reduce((a, s) => a + Math.max(0, s.value), 0))
const arcs = computed(() => {
  let offset = 0
  return props.segments.map((s) => {
    const pct = total.value ? (Math.max(0, s.value) / total.value) * 100 : 0
    const arc = { ...s, pct, dash: `${pct} ${100 - pct}`, offset: 25 - offset }
    offset += pct
    return arc
  })
})
</script>
<template>
  <div class="donut-wrap">
    <svg :width="size" :height="size" viewBox="0 0 42 42" role="img" :aria-label="segments.map((s) => `${s.label} ${s.value}`).join(', ')">
      <circle cx="21" cy="21" :r="R" fill="none" stroke="#eef1f1" stroke-width="6" />
      <circle v-for="a in arcs" :key="a.label" cx="21" cy="21" :r="R" fill="none" :stroke="a.color" stroke-width="6" :stroke-dasharray="a.dash" :stroke-dashoffset="a.offset" />
    </svg>
    <div class="legend">
      <div v-for="a in arcs" :key="a.label" class="legend-item"><span class="legend-dot" :style="{ background: a.color }" />{{ a.label }} <span class="muted">{{ Math.round(a.pct) }}%</span></div>
    </div>
  </div>
</template>
