<script setup lang="ts">
import { formatMoney } from '~~/shared/money'
const props = defineProps<{ value: number | null | undefined; currency?: string }>()
</script>
<template><span>{{ formatMoney(props.value, props.currency || 'EUR') }}</span></template>
