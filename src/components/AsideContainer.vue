<script setup lang="ts">
const open = ref(false)
provideLocal('open', open)
const shouldShow = computed(() => open.value)
</script>

<template>
  <aside
    class="px-3 bg-neutral-900 flex-shrink-0 flex-col w-16 w-284px hidden transition-all lg:flex"
    :class="{
      '-ml-284px': shouldShow,
      'ml-0': !shouldShow,
    }"
  >
    <slot />
  </aside>
</template>
