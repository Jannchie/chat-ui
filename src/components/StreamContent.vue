<script setup lang="ts">
import { ref } from 'vue'
import { isKatexLoaded, isShikiLoaded, loadKatex, loadShiki, md } from '../utils'

const props = withDefaults(defineProps<{
  content: string
  reasoning?: string
  loading: boolean
  model?: string
}>(), {
  reasoning: '',
  model: '',
})

const content = computed(() => props.content)
const reasoning = computed(() => props.reasoning)
const streamMarkdownWrapperRef = ref<HTMLElement | null>(null)
const loading = computed(() => props.loading)
const debouncedLoading = refDebounced(loading, 1000)
const showCopyTooltip = ref(false)

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
  const msg = content.value
  return splitContent(msg)
})

const contentFinal = computed(() => {
  const msg = content.value
  return props.loading ? formatedContent.value : msg
})

const contentVNodes = computedWithControl(() => [contentFinal.value, isShikiLoaded.value, isKatexLoaded.value], () => {
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
  reasoning,
], () => {
  const reasoningContent = reasoning.value ?? ''

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

debouncedWatch([content], () => {
  contentVNodes.trigger()
}, {
  debounce: 300,
})

debouncedWatch([reasoning], () => {
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
</script>

<template>
  <div class="relative">
    <div>
      <div
        v-if="reasoning && reasoning.length > 0"
        class="bg-neutral-1 text-xs mb-4 px-4 py-2 rounded-xl min-w-full w-full overflow-auto prose prose-gray dark:bg-neutral-950 dark:prose-invert"
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
            <i class="i-tabler-copy dark:text-neutral-4 text-neutral-500 h-5 w-5" />
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
        ref="streamMarkdownWrapperRef"
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
