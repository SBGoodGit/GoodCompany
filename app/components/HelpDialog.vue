<script setup lang="ts">
// The "How it works" popup: what this is, how it works, what to know, and the basis in the specification.
const { current, close } = useHelp()
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
const route = useRoute()
watch(() => route.fullPath, close)
</script>

<template>
  <div v-if="current" class="modal-backdrop" data-test="help-dialog" @click.self="close">
    <div class="modal help-modal" role="dialog" aria-modal="true" :aria-label="`How it works: ${current.title}`">
      <div class="row" style="align-items: flex-start">
        <h3 style="margin: 0">How it works: {{ current.title }}</h3>
        <span class="spacer" />
        <button class="icon-btn" type="button" aria-label="Close" data-test="help-close" @click="close">✕</button>
      </div>
      <p class="help-what">{{ current.what }}</p>
      <template v-if="current.steps?.length">
        <h4>How it works</h4>
        <ol class="help-list"><li v-for="s in current.steps" :key="s">{{ s }}</li></ol>
      </template>
      <template v-if="current.know?.length">
        <h4>Good to know</h4>
        <ul class="help-list"><li v-for="k in current.know" :key="k">{{ k }}</li></ul>
      </template>
      <p class="small muted" style="margin-bottom: 0">Based on: {{ current.basis }}</p>
    </div>
  </div>
</template>
