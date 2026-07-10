<script setup lang="ts">
import {
  bindStreamingMarkdownTrigger,
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
const { copy, copied: showCopyTooltip, isSupported: clipboardSupported }
  = useClipboard({ copiedDuring: 2000 })

const { contentFinal, contentVNodes } = createStreamingMarkdownVNodes(
  content,
  loading,
)

const StreamMarkdownContent = createVNodeRendererComponent(contentVNodes)

bindStreamingMarkdownTrigger(contentVNodes, content)

// 推理仍在输出且正文尚未开始
const thinkingActive = computed(
  () => props.loading && props.content.length === 0 && props.reasoning.length > 0,
)

// Enhanced copy functionality with tooltip feedback
function copyContentToClipboard() {
  if (!clipboardSupported.value) {
    console.warn('Clipboard API is not available in this context.')
    return
  }
  copy(contentFinal.value).catch((error) => {
    console.error(`Failed to copy content: ${error}`)
  })
}
</script>

<template>
  <div class="relative">
    <div>
      <ThinkingBlock :reasoning="reasoning" :active="thinkingActive" />

      <div class="relative mb-2">
        <div class="absolute right-0 top-0 z-10">
          <button
            class="h-8 w-8 flex items-center justify-center rounded bg-transparent p-1.5 opacity-50 transition-all duration-200 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            aria-label="Copy markdown content"
            @click="copyContentToClipboard"
          >
            <i
              class="i-tabler-copy h-5 w-5 text-neutral-500 dark:text-neutral-4"
            />
            <div
              v-if="showCopyTooltip"
              class="pointer-events-none absolute right-0 whitespace-nowrap rounded bg-black/70 px-2 py-1 text-xs text-white -bottom-7 dark:bg-white/70 dark:text-black"
            >
              Copied!
            </div>
          </button>
        </div>
      </div>

      <div class="chat-prose">
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
