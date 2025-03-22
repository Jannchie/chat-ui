<script setup lang="ts">
import { onMounted, ref } from 'vue'

defineProps<{
  content: string
  title?: string
}>()

const collapsed = ref<boolean>(true)
const contentRef = ref<HTMLElement | null>(null)
const needsCollapse = ref<boolean>(true)

// Check if content needs to be collapsed
onMounted(() => {
  if (contentRef.value) {
    // Check if content height exceeds 3 lines
    const lineHeight = Number.parseInt(getComputedStyle(contentRef.value).lineHeight)
    const contentHeight = contentRef.value.scrollHeight

    // If content height is less than or equal to 3 lines, no need to collapse
    needsCollapse.value = contentHeight > (lineHeight * 3)

    // If no need to collapse, set collapsed to false by default
    if (!needsCollapse.value) {
      collapsed.value = false
    }
  }
})
</script>

<template>
  <div class="error-message border border-red-200 rounded-md bg-red-50 p-3 dark:border-red-700 dark:bg-red-900">
    <div class="flex items-start">
      <!-- Content container -->
      <div class="ml-3 flex-grow">
        <!-- Error title (if provided) -->
        <h3
          v-if="title"
          class="mb-1 text-sm text-red-800 font-medium dark:text-red-300"
        >
          {{ title }}
        </h3>

        <!-- Error content -->
        <div class="text-sm text-red-700 dark:text-red-200">
          <pre
            ref="contentRef"
            class="whitespace-pre-wrap bg-transparent font-inherit"
            :class="collapsed ? 'line-clamp-3' : 'line-clamp-none'"
            v-text="content"
          />
        </div>
      </div>

      <!-- Expand/collapse button -->
      <div
        v-if="needsCollapse"
        class="ml-2 flex-shrink-0"
        @click="collapsed = !collapsed"
      >
        <button class="h-8 w-8 flex items-center justify-center rounded-full text-red-500 hover:bg-red-100">
          <i
            :class="collapsed ? 'i-tabler-chevron-down' : 'i-tabler-chevron-up'"
          />
        </button>
      </div>
    </div>
  </div>
</template>
