<script setup lang="ts">
import { ref } from 'vue'
import {
  bindStreamingMarkdownTrigger,
  createReasoningMarkdownVNodes,
  createStreamingMarkdownVNodes,
  createVNodeRendererComponent,
} from '../lib/preferredMarkdownStream'

const props = withDefaults(
  defineProps<{
    content: string
    reasoning?: string
    loading: boolean
    model?: string
  }>(),
  {
    reasoning: '',
    model: '',
  },
)

const content = computed(() => props.content)
const reasoning = computed(() => props.reasoning)
const loading = computed(() => props.loading)
const showCopyTooltip = ref(false)

const { contentFinal, contentVNodes } = createStreamingMarkdownVNodes(
  content,
  loading,
)
const reasoningVNodes = createReasoningMarkdownVNodes(reasoning)

const StreamMarkdownContent = createVNodeRendererComponent(contentVNodes)
const StreamMarkdownReasoning = createVNodeRendererComponent(reasoningVNodes)

bindStreamingMarkdownTrigger(contentVNodes, content)
bindStreamingMarkdownTrigger(reasoningVNodes, reasoning)

// Enhanced copy functionality with tooltip feedback
function copyContentToClipboard() {
  const markdownContent = contentFinal.value
  navigator.clipboard
    .writeText(markdownContent)
    .then(() => {
      showCopyTooltip.value = true
      setTimeout(() => {
        showCopyTooltip.value = false
      }, 2000)
    })
    .catch((error) => {
      console.error(`Failed to copy content: ${error}`)
    })
}
</script>

<template>
  <div class="relative">
    <div>
      <div
        v-if="reasoning && reasoning.length > 0"
        class="dark:bg-neutral-1 text-xs mb-4 px-4 py-2 rounded-xl bg-neutral-200 min-w-full w-full overflow-auto prose prose-gray dark:bg-neutral-950 dark:prose-invert"
      >
        <StreamMarkdownReasoning />
      </div>

      <div class="mb-2 relative">
        <div class="right-0 top-0 absolute z-10">
          <button
            class="p-1.5 rounded bg-transparent opacity-50 flex h-8 w-8 transition-all duration-200 items-center justify-center hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            aria-label="Copy markdown content"
            @click="copyContentToClipboard"
          >
            <i
              class="i-tabler-copy dark:text-neutral-4 text-neutral-500 h-5 w-5"
            />
            <div
              v-if="showCopyTooltip"
              class="text-xs text-white px-2 py-1 rounded bg-black/70 pointer-events-none whitespace-nowrap right-0 absolute dark:text-black dark:bg-white/70 -bottom-7"
            >
              Copied!
            </div>
          </button>
        </div>
      </div>

      <div
        key="prose"
        class="hover text-sm prose prose-neutral md:text-base prose-code:text-sm prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-base children:mt-0 dark:prose-invert prose-code:after:content-none prose-code:before:content-none"
      >
        <StreamMarkdownContent />
      </div>
    </div>
  </div>
</template>

<style>
li > p {
  margin: 0.25em 0em !important;
}
.code-content > pre {
  padding: 0px !important;
}
.code-content pre {
  margin: 0px !important;
}

/* pre 代码块主题支持 */
pre {
  background-color: #f5f5f5 !important;
  border: 1px solid #e5e7eb !important;
}
:root[data-scheme="dark"] pre {
  background-color: #1e1e1e !important;
  border: 1px solid #374151 !important;
}

/*非 pre 里的 code 有背景色 */
code:not(pre code) {
  background-color: #e5e7eb !important; /* 日间模式：浅灰色背景 */
  border-radius: 0.25rem;
  border: 1px solid #d1d5db;
  padding: 0.125rem 0.5rem;
  color: #374151 !important; /* 日间模式：深灰色文字 */
}

/* 暗色模式的代码样式 */
:root[data-scheme="dark"] code:not(pre code) {
  background-color: #222 !important; /* 暗色模式：深色背景 */
  border: 1px solid #444;
  color: #e5e7eb !important; /* 暗色模式：浅色文字 */
}
</style>
