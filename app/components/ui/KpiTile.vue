<script setup lang="ts">
// KPI tile (showcase dashboard strip): coloured icon, label, value, and an optional bar (0–100).
withDefaults(defineProps<{ label: string; value: string; icon?: string; color?: string; bar?: number | null }>(), { icon: '◆', color: 'var(--teal)', bar: null })
</script>
<template>
  <div class="card">
    <div class="kpi-top">
      <div class="lbl"><span class="ic" :style="{ background: color }">{{ icon }}</span>{{ label }}</div>
      <div class="kpi-value">{{ value }}</div>
    </div>
    <UiProgressBar v-if="bar !== null" :value="bar" :color="color" />
  </div>
</template>
