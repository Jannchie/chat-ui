<script setup lang="ts">
import { nextTick, ref, watch } from 'vue'

const props = defineProps<{
  language: string
  content: string
  preAttrs: Record<string, any>
}>()

const copied = ref(false)
const contentRef = ref<HTMLDivElement | null>(null)

function syncPreAttrs() {
  const preElement = contentRef.value?.querySelector('pre')
  if (!preElement) {
    return
  }

  for (const [key, value] of Object.entries(props.preAttrs)) {
    if (value == null) {
      continue
    }

    preElement.setAttribute(key, String(value))
  }
}

function copyCode() {
  const tempElement = document.createElement('div')
  tempElement.innerHTML = props.content
  const { textContent } = tempElement
  navigator.clipboard.writeText(textContent ?? '').then(() => {
    copied.value = true
    setTimeout(() => {
      copied.value = false
    }, 2000)
  })
}

watch(
  () => [props.content, props.preAttrs],
  async () => {
    await nextTick()
    syncPreAttrs()
  },
  { immediate: true, deep: true },
)
</script>

<template>
  <div
    class="code-block-wrapper border rounded-xl overflow-hidden max-w-[calc(100vw-24px)]"
  >
    <div
      class="code-block-toolbar bg-neutral-100 border-b px-4 text-neutral-4 py-2 flex justify-between items-center dark:bg-neutral-800 dark:border-neutral-700"
    >
      <span class="code-language text-sm uppercase font-mono">
        {{ language || 'text' }}
      </span>
      <button
        type="button"
        class="copy-button text-sm w-6 h-6 rounded hover:bg-neutral-7 leading-0"
        @click="copyCode"
      >
        <i v-if="copied" class="i-tabler-check" />
        <i v-else class="i-tabler-copy" />
      </button>
    </div>
    <div ref="contentRef" class="code-content" v-html="content" />
  </div>
</template>

<style scoped>
.code-block-wrapper {
  margin-block: 0.5rem;
  margin-inline: 0;
}

.code-content {
  background-color: #f5f5f5;
}

:root[data-scheme="dark"] .code-content {
  background-color: #1e1e1e;
}

.code-content :deep(pre) {
  margin: 0 !important;
  border-radius: 0 !important;
  padding-block: 0.8571429em !important;
  padding-inline: 1.1428571em !important;
}
</style>
