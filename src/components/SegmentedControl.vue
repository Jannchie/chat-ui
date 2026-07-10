<script setup lang="ts" generic="T extends string | number">
defineProps<{
  options: ReadonlyArray<{ label: string, value: T, icon?: string }>
}>()

const model = defineModel<T>()
</script>

<template>
  <div
    class="inline-flex gap-0.5 rounded-lg bg-neutral-200/70 p-0.5 dark:bg-neutral-800"
  >
    <button
      v-for="option in options"
      :key="String(option.value)"
      class="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-sm transition-all"
      :class="
        model === option.value
          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-600 dark:text-white'
          : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-white'
      "
      @click="model = option.value"
    >
      <i v-if="option.icon" :class="option.icon" class="text-sm" />
      {{ option.label }}
    </button>
  </div>
</template>
