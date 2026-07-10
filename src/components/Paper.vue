<script setup lang="ts">
defineProps<{
  loading?: boolean
}>()
</script>

<template>
  <div class="relative rounded-xl bg-neutral-100 p-4 dark:bg-elevated">
    <div
      v-if="loading"
      class="absolute right-4 top-4 text-neutral-400 leading-0"
    >
      <i class="i-tabler-loader-2 h-4 w-4 animate-spin" />
    </div>
    <slot />
  </div>
</template>
