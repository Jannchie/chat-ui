<script setup lang="ts">
import type { MessageContent } from '../types/message'
import { ref } from 'vue'
import { loadKatex, loadShiki, md } from '../utils'

const props = withDefaults(defineProps<{
  content: MessageContent
  reasoning?: string
  loading: boolean
  model?: string
}>(), {
  reasoning: '',
  model: '',
})

const streamMarkdownWrapperRef = ref<HTMLElement | null>(null)
const loading = computed(() => props.loading)
const debouncedLoading = refDebounced(loading, 1000)
const showCopyTooltip = ref(false)
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

function editResult(childrenRaw: VNode[]): VNode[] {
  // eslint-disable-next-line unicorn/no-magic-array-flat-depth
  const children = childrenRaw.flat(20)
  for (const child of children) {
    if (typeof child.children === 'string') {
      child.props = {
        ...child.props,
      }
      if (debouncedLoading.value) {
        child.props.class = 'fade-in'
      }
    }
    if (child.children && Array.isArray(child.children) && child.children.length > 0) {
      editResult(child.children as VNode[])
    }
  }
  return children
}

function splitContent(msg: string) {
  const sentences = msg.split(/(?<=[。？！；、，\n])|(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=[.?!`])/g)

  if (sentences.length > 0 && !/[.?!。？！；，、`\n]$/.test(sentences.at(-1)!)) {
    sentences.pop()
  }

  if (sentences.length > 0 && /^\d+\./.test(sentences.at(-1)!)) {
    sentences.pop()
  }

  const content = sentences.join('')
  return content
}

const formatedContent = computed(() => {
  const msg = textContent.value
  return splitContent(msg)
})

const contentFinal = computed(() => {
  const msg = textContent.value
  return props.loading ? formatedContent.value : msg
})

const contentVNodes = computedWithControl([contentFinal], () => {
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
  return editResult(r)
})

const reasoningVNodes = computedWithControl([
  toRef(props, 'reasoning'),
], () => {
  const reasoningContent = props.reasoning ?? ''

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

// Enhanced copy functionality with tooltip feedback
function copyContentToClipboard() {
  const markdownContent = contentFinal.value
  navigator.clipboard.writeText(markdownContent).then(() => {
    showCopyTooltip.value = true
    setTimeout(() => {
      showCopyTooltip.value = false
    }, 2000)
  }).catch((error) => {
    console.error(`Failed to copy content: ${error}`)
  })
}

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
      <div
        v-if="props.reasoning && props.reasoning.length > 0"
        class="mb-4 min-w-full w-full overflow-auto rounded-xl bg-neutral-1 px-4 py-2 text-xs prose prose-gray dark:bg-neutral-950 dark:prose-invert"
      >
        <StreamMarkdownReasoning />
      </div>

      <div class="relative mb-2">
        <div class="absolute right-0 top-0 z-10">
          <button
            class="h-8 w-8 flex items-center justify-center rounded bg-transparent p-1.5 opacity-50 transition-all duration-200 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
            aria-label="Copy markdown content"
            @click="copyContentToClipboard"
          >
            <i class="i-tabler-copy h-5 w-5 text-neutral-500 dark:text-neutral-4" />
            <div
              v-if="showCopyTooltip"
              class="pointer-events-none absolute right-0 whitespace-nowrap rounded bg-black/70 px-2 py-1 text-xs text-white -bottom-7 dark:bg-white/70 dark:text-black"
            >
              Copied!
            </div>
          </button>
        </div>
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
            class="max-h-48 max-w-xs cursor-pointer border border-neutral-6 rounded-lg object-cover"
            @click="openImagePreview(part.image_url.url)"
          >
        </div>

        <!-- Function Call Content -->
        <div
          v-else-if="part.type === 'function_call'"
          class="function-call-content border border-blue-200 rounded-lg bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20"
        >
          <div class="mb-2 flex items-center gap-2">
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
          class="tool-call-content border border-green-200 rounded-lg bg-green-50 p-3 dark:border-green-800 dark:bg-green-900/20"
        >
          <div class="mb-2 flex items-center gap-2">
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
        class="hover text-sm prose prose-neutral children:mt-0 md:text-base prose-code:text-sm prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-base dark:prose-invert prose-code:after:content-none prose-code:before:content-none"
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
  background-color: #222 !important; /* 设定非 pre 里面的 code 背景色 */
  border-radius: 0.25rem;
  border: 1px solid #444;
  padding: 0.125rem 0.5rem;
}
</style>
