<script setup lang="ts">
import type { MessageContent } from '../types/message'
import { ref } from 'vue'
import { isKatexLoaded, isShikiLoaded, loadKatex, loadShiki, md } from '../utils'
import { addFadeInToVNodes, splitContent } from '../utils/streamingText'

const props = withDefaults(defineProps<{
  content: MessageContent
  reasoning?: string
  loading: boolean
  thinking?: boolean
  model?: string
}>(), {
  reasoning: '',
  model: '',
})

const streamMarkdownWrapperRef = ref<HTMLElement | null>(null)
const loading = computed(() => props.loading)
const showImagePreview = ref<boolean>(false)
const previewImageUrl = ref<string>('')

const debouncedLoading = refDebounced(loading, 1000)

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

const formattedContent = computed(() => splitContent(textContent.value))
const contentFinal = computed(() => props.loading ? formattedContent.value : textContent.value)

const contentVNodes = computedWithControl(() => [isShikiLoaded.value, isKatexLoaded.value, contentFinal.value], () => {
  const content = contentFinal.value ?? ''

  // Check if content contains code blocks and load Shiki if needed
  if (content.includes('```') || content.includes('`')) {
    loadShiki()
  }

  // Check if content contains math expressions and load KaTeX if needed
  if (content.includes('$') || content.includes(String.raw`\(`) || content.includes(String.raw`\[`)) {
    loadKatex()
  }

  const r = md.render(content, {
    sanitize: true,
  }) as unknown as VNode[]
  return addFadeInToVNodes(r, debouncedLoading.value)
})

const reasoningVNodes = computedWithControl([
  toRef(props, 'reasoning'),
], () => {
  const reasoningContent = props.reasoning ?? ''

  if (!reasoningContent) {
    return []
  }

  // Check if reasoning contains code blocks and load Shiki if needed
  if (reasoningContent.includes('```') || reasoningContent.includes('`')) {
    loadShiki()
  }

  // Check if reasoning contains math expressions and load KaTeX if needed
  if (reasoningContent.includes('$') || reasoningContent.includes(String.raw`\(`) || reasoningContent.includes(String.raw`\[`)) {
    loadKatex()
  }

  return md.render(reasoningContent, {
    sanitize: true,
  }) as unknown as VNode[]
})

// eslint-disable-next-line vue/one-component-per-file
const StreamMarkdownContent = defineComponent({
  setup() {
    return () => {
      return contentVNodes.value
    }
  },
})

// eslint-disable-next-line vue/one-component-per-file
const StreamMarkdownReasoning = defineComponent({
  setup() {
    return () => {
      return reasoningVNodes.value
    }
  },
})

debouncedWatch([contentFinal], () => {
  contentVNodes.trigger()
}, {
  debounce: 300,
})

debouncedWatch([toRef(props, 'reasoning')], () => {
  reasoningVNodes.trigger()
}, {
  debounce: 300,
})

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
      <!-- Thinking indicator -->
      <div
        v-if="props.thinking && !textContent"
        class="text-xs mb-4 px-4 py-3 rounded-xl bg-neutral-200 flex gap-2 min-w-full w-full items-center dark:bg-neutral-800"
      >
        <i class="i-tabler-brain h-4 w-4 dark:text-neutral-200" />
        <span class="animate-gradient-text">AI is thinking...</span>
      </div>

      <div
        v-if="props.reasoning && props.reasoning.length > 0"
        class="dark:bg-neutral-1 text-xs mb-4 px-4 py-2 rounded-xl bg-neutral-200 min-w-full w-full overflow-auto prose prose-gray dark:bg-neutral-950 dark:prose-invert"
      >
        <div class="text-xs text-gray-500 mb-2">
          Reasoning ({{ props.reasoning.length }} chars):
        </div>
        <StreamMarkdownReasoning />
      </div>

      <!-- Render non-text content first -->
      <div
        v-for="(part, index) in nonTextContent"
        :key="index"
        class="mb-3"
      >
        <!-- Image Content -->
        <div
          v-if="part.type === 'image_url'"
          class="image-content"
        >
          <img
            :src="part.image_url.url"
            alt="Image"
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
            <span class="text-xs text-green-600 font-mono dark:text-green-400">{{ part.tool_call.id }}</span>
          </div>
          <div class="text-sm text-green-800 font-mono dark:text-green-200">
            {{ formatToolCall(part.tool_call) }}
          </div>
        </div>
      </div>

      <!-- Render text content as markdown -->
      <div
        v-if="textContent"
        key="prose"
        ref="streamMarkdownWrapperRef"
        class="hover text-sm prose prose-neutral md:text-base prose-code:text-sm prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-base children:mt-0 dark:prose-invert prose-code:after:content-none prose-code:before:content-none"
      >
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
.code-content  pre {
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

:root {
  --thinking-text-fallback-color: #52525b;
  --thinking-text-gradient: linear-gradient(90deg,
    #606368 0%,
    #a6a9af 15%,
    #ffffff 30%,
    #ffffff 50%,
    #a6a9af 70%,
    #606368 85%,
    #606368 100%
  );
}

:root[data-scheme="dark"] {
  --thinking-text-fallback-color: #e5e7eb;
  --thinking-text-gradient: linear-gradient(90deg,
    #9ca3af 0%,
    #d1d5db 25%,
    #f9fafb 50%,
    #d1d5db 75%,
    #9ca3af 100%
  );
}

/* 灰色到白色的渐变文本动画 */
.animate-gradient-text {
  animation: gradient-text 1s linear infinite;
  color: var(--thinking-text-fallback-color);
  display: inline-block;
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .animate-gradient-text {
    color: transparent;
    background: var(--thinking-text-gradient);
    background-size: 300% 100%;
    background-position: 0% 50%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

@keyframes gradient-text {
  0% {
    background-position: 300% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
