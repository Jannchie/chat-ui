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
    class="fixed inset-0 z-40 bg-black/50 lg:hidden"
    @click="asideOpen = false"
  />
  <aside
    class="fixed inset-y-0 left-0 z-50 h-100dvh w-284px flex flex-shrink-0 flex-col bg-neutral-200 px-3 transition-transform lg:static lg:translate-x-0 dark:bg-neutral-900"
    :class="asideOpen ? 'translate-x-0' : '-translate-x-full'"
  >
    <slot />
  </aside>
</template>
