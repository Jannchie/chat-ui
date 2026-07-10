<script setup lang="ts">
import type { MessageContent } from '../types/message'
import { ref } from 'vue'
import {
  bindStreamingMarkdownTrigger,
  createStreamingMarkdownVNodes,
  createVNodeRendererComponent,
} from '../lib/preferredMarkdownStream'

const props = withDefaults(
  defineProps<{
    content: MessageContent
    reasoning?: string
    loading: boolean
    thinking?: boolean
    model?: string
    reasoningStartAt?: number
    reasoningEndAt?: number
  }>(),
  {
    reasoning: '',
    model: '',
  },
)

const loading = computed(() => props.loading)
const showImagePreview = ref<boolean>(false)
const previewImageUrl = ref<string>('')

// Extract text content for markdown rendering
const textContent = computed(() => {
  if (typeof props.content === 'string') {
    return props.content
  }

  if (Array.isArray(props.content)) {
    return props.content
      .filter(item => item.type === 'text')
      .map(item => item.text)
      .join('\n')
  }

  return ''
})

// Extract non-text content for special rendering
const nonTextContent = computed(() => {
  if (typeof props.content === 'string') {
    return []
  }

  if (Array.isArray(props.content)) {
    return props.content.filter(item => item.type !== 'text')
  }

  return []
})

const { contentFinal, contentVNodes } = createStreamingMarkdownVNodes(
  textContent,
  loading,
)

const StreamMarkdownContent = createVNodeRendererComponent(contentVNodes)

bindStreamingMarkdownTrigger(
  contentVNodes,
  contentFinal,
)

// 等待响应，或推理仍在输出（尚无正文）
const thinkingActive = computed(
  () =>
    (props.thinking && !textContent.value)
    || (props.loading && !textContent.value && props.reasoning.length > 0),
)

function openImagePreview(imageUrl: string) {
  previewImageUrl.value = imageUrl
  showImagePreview.value = true
}

function formatFunctionCall(functionCall: { name: string, arguments: string }) {
  try {
    const args = JSON.parse(functionCall.arguments)
    const formattedArgs = Object.entries(args)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join(', ')
    return `${functionCall.name}(${formattedArgs})`
  }
  catch {
    return `${functionCall.name}(${functionCall.arguments})`
  }
}

function formatToolCall(toolCall: any) {
  if (toolCall.function) {
    return `${toolCall.function.name}(${toolCall.function.arguments})`
  }
  if (toolCall.mcp) {
    return `${toolCall.mcp.server}:${toolCall.mcp.tool}(${toolCall.mcp.arguments})`
  }
  return `${toolCall.type} call: ${toolCall.id}`
}
</script>

<template>
  <div class="relative">
    <div>
      <!-- Thinking / reasoning block (collapsed by default) -->
      <ThinkingBlock
        :reasoning="props.reasoning"
        :active="thinkingActive"
        :started-at="props.reasoningStartAt"
        :ended-at="props.reasoningEndAt"
      />

      <!-- Render non-text content first -->
      <div v-for="(part, index) in nonTextContent" :key="index" class="mb-3">
        <!-- Image Content -->
        <div v-if="part.type === 'image_url'" class="image-content">
          <img
            :src="part.image_url.url"
            alt="Image"
            loading="lazy"
            decoding="async"
            class="border-neutral-6 border rounded-lg max-h-48 max-w-xs cursor-pointer object-cover"
            @click="openImagePreview(part.image_url.url)"
          >
        </div>

        <!-- Function Call Content -->
        <div
          v-else-if="part.type === 'function_call'"
          class="function-call-content p-3 border border-blue-200 rounded-lg bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20"
        >
          <div class="mb-2 flex gap-2 items-center">
            <i class="i-tabler-function text-blue-600 dark:text-blue-400" />
            <span class="text-sm text-blue-700 font-medium dark:text-blue-300">Function Call</span>
          </div>
          <div class="text-sm text-blue-800 font-mono dark:text-blue-200">
            {{ formatFunctionCall(part.function_call) }}
          </div>
        </div>

        <!-- Tool Call Content -->
        <div
          v-else-if="part.type === 'tool_call'"
          class="tool-call-content p-3 border border-green-200 rounded-lg bg-green-50 dark:border-green-800 dark:bg-green-900/20"
        >
          <div class="mb-2 flex gap-2 items-center">
            <i class="i-tabler-tool text-green-600 dark:text-green-400" />
            <span class="text-sm text-green-700 font-medium dark:text-green-300">Tool Call</span>
            <span
              class="text-xs text-green-600 font-mono dark:text-green-400"
            >{{ part.tool_call.id }}</span>
          </div>
          <div class="text-sm text-green-800 font-mono dark:text-green-200">
            {{ formatToolCall(part.tool_call) }}
          </div>
        </div>
      </div>

      <!-- Render text content as markdown -->
      <div v-if="textContent" class="chat-prose">
        <StreamMarkdownContent />
      </div>
    </div>

    <!-- Image Preview Modal -->
    <ImagePreviewModal
      v-model:visible="showImagePreview"
      :image-url="previewImageUrl"
    />
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
