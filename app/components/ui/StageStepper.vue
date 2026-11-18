<script setup lang="ts">
// Stage tracker after the showcase. `current` is the index of the current stage (-1: none; ≥ length: all done).
defineProps<{ stages: string[]; current: number }>()
</script>
<template>
  <div class="stepper">
    <div v-for="(s, i) in stages" :key="s" class="step" :class="{ done: i < current, current: i === current }">{{ s }}</div>
  </div>
</template>
