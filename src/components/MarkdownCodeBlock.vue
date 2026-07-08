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
  if (!navigator.clipboard?.writeText) {
    console.warn('Clipboard API is not available in this context.')
    return
  }
  const tempElement = document.createElement('div')
  tempElement.innerHTML = props.content
  const { textContent } = tempElement
  navigator.clipboard
    .writeText(textContent ?? '')
    .then(() => {
      copied.value = true
      setTimeout(() => {
        copied.value = false
      }, 2000)
    })
    .catch((error) => {
      console.error(`Failed to copy code: ${error}`)
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
    class="code-block-wrapper border rounded-xl max-w-[calc(100vw-24px)] overflow-hidden"
  >
    <div
      class="code-block-toolbar text-neutral-4 px-4 py-2 border-b bg-neutral-100 flex items-center justify-between dark:border-neutral-700 dark:bg-neutral-800"
    >
      <span class="code-language text-sm font-mono uppercase">
        {{ language || 'text' }}
      </span>
      <button
        type="button"
        class="copy-button hover:bg-neutral-7 text-sm leading-0 rounded h-6 w-6"
        @click="copyCode"
      >
        <i v-if="copied" class="i-tabler-check" />
        <i v-else class="i-tabler-copy" />
      </button>
    </div>
    <div ref="contentRef" class="code-content" v-html="content" />
  </div>
</template>

<style>
@font-face {
  font-family: 'Berkeley Mono';
  src: url('https://cdn.jannchie.com/fonts/variants/BerkeleyMono-Regular.woff2') format('woff2');
  font-weight: 400;
  font-style: normal;
  font-display: swap;
}
</style>

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

.code-content :deep(pre),
.code-content :deep(code) {
  font-family: 'Berkeley Mono', 'JetBrains Mono', 'Fira Code', monospace;
}

.code-content :deep(pre) {
  margin: 0 !important;
  border-radius: 0 !important;
  padding-block: 0.8571429em !important;
  padding-inline: 1.1428571em !important;
}
</style>
