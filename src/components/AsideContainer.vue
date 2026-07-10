<script setup lang="ts">
import { asideOpen } from '../shared'

// 移动端选中会话（路由变化）后自动收起抽屉
const route = useRoute()
watch(
  () => route.fullPath,
  () => {
    asideOpen.value = false
  },
)
</script>

<template>
  <div
    v-if="asideOpen"
    class="bg-black/50 inset-0 fixed z-40 lg:hidden"
    @click="asideOpen = false"
  />
  <aside
    class="px-3 bg-neutral-200 flex flex-shrink-0 flex-col h-100dvh w-284px transition-transform inset-y-0 left-0 fixed z-50 dark:bg-neutral-900 lg:translate-x-0 lg:static"
    :class="asideOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <slot />
  </aside>
</template>
