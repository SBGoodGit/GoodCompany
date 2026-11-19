<script setup lang="ts">
// Thin progress bar (showcase "thinbar"). `value` 0–100.
const props = withDefaults(defineProps<{ value: number; color?: string }>(), { color: 'var(--teal)' })
const width = computed(() => `${Math.max(0, Math.min(100, props.value))}%`)
</script>
<template>
  <div class="thinbar" role="progressbar" :aria-valuenow="Math.round(value)" aria-valuemin="0" aria-valuemax="100"><div :style="{ width, background: color }" /></div>
</template>
