<script setup lang="ts">
// ⓘ icon next to a function's heading; opens the popup for that topic.
const props = defineProps<{ topic: string }>()
const { openTopic } = useHelp()
</script>
<template>
  <button class="info-icon" type="button" :aria-label="`How it works: ${topic}`" :data-test="`info-${topic}`" @click.stop="openTopic(props.topic)">ⓘ</button>
</template>
