<script setup lang="ts">
import { ref } from 'vue'
import { md } from '../utils'

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

const contentVNodes = computedWithControl([contentFinal], () => {
  const r = md.render(contentFinal.value ?? '', {
    sanitize: true,
  }) as unknown as VNode[]
  return editResult(r)
})

const reasoningVNodes = computedWithControl([
  reasoning,
], () => {
  return md.render(reasoning.value ?? '', {
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

      <div
        key="prose"
        ref="streamMarkdownWrapperRef"
        class="hover text-sm prose prose-neutral children:mt-0 md:text-base prose-code:text-sm prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-base dark:prose-invert prose-code:after:content-none prose-code:before:content-none"
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
