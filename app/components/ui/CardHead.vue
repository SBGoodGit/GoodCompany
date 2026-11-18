<script setup lang="ts">
// Card header (showcase): icon and title on the left, an optional link or action on the right.
defineProps<{ title: string; icon?: string; link?: string; linkLabel?: string }>()
</script>
<template>
  <div class="card-head">
    <h3 class="card-title"><span v-if="icon" class="ic">{{ icon }}</span>{{ title }}</h3>
    <slot><NuxtLink v-if="link" :to="link" class="card-link">{{ linkLabel ?? 'Open →' }}</NuxtLink></slot>
  </div>
</template>
