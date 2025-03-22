<script setup lang="ts">
const open = ref(false)
provideLocal('open', open)
const shouldShow = computed(() => open.value)
</script>

<template>
  <aside
    class="hidden w-16 w-284px flex-shrink-0 flex-col bg-neutral-9 px-3 transition-all lg:flex"
    :class="{
      '-ml-284px': shouldShow,
      'ml-0': !shouldShow,
    }"
  >
    <slot />
  </aside>
</template>
