<script setup lang="ts">
import type { VNode } from 'vue'
import { debouncedWatch, refDebounced } from '@vueuse/core'
import { computed } from 'vue'

interface StreamingTextProps {
  content: string
  loading: boolean
  debounceDelay?: number
  splitDelay?: number
  fadeInClass?: string
}

const props = withDefaults(defineProps<StreamingTextProps>(), {
  debounceDelay: 1000,
  splitDelay: 300,
  fadeInClass: 'fade-in',
})

const emit = defineEmits<{
  contentUpdated: [content: string]
}>()

const content = computed(() => props.content)
const loading = computed(() => props.loading)
const debouncedLoading = refDebounced(loading, props.debounceDelay)

/**
 * Add fade-in animation class to text nodes in VNode tree
 * This is the core function that enables streaming text animation
 */
function editResult(childrenRaw: VNode[]): VNode[] {
  // eslint-disable-next-line unicorn/no-magic-array-flat-depth
  const children = childrenRaw.flat(20)
  for (const child of children) {
    if (typeof child.children === 'string') {
      child.props = {
        ...child.props,
      }
      if (debouncedLoading.value) {
        const existingClass = child.props.class || ''
        child.props.class = `${existingClass} ${props.fadeInClass}`.trim()
      }
    }
    if (child.children && Array.isArray(child.children) && child.children.length > 0) {
      editResult(child.children as VNode[])
    }
  }
  return children
}

/**
 * Smart content splitting to avoid displaying incomplete sentences
 * Supports both English and Chinese punctuation
 */
function splitContent(msg: string): string {
  const sentences = msg.split(/(?<=[。？！；、，\n])|(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=[.?!`])/g)

  if (sentences.length > 0 && !/[.?!。？！；，、`\n]$/.test(sentences.at(-1)!)) {
    sentences.pop()
  }

  if (sentences.length > 0 && /^\d+\./.test(sentences.at(-1)!)) {
    sentences.pop()
  }

  const processedContent = sentences.join('')
  return processedContent
}

const formattedContent = computed(() => {
  const msg = content.value
  return splitContent(msg)
})

const contentFinal = computed(() => {
  const msg = content.value
  const result = props.loading ? formattedContent.value : msg
  nextTick(() => {
    emit('contentUpdated', result)
  })
  return result
})

// Debounced content update watcher
debouncedWatch([content], () => {
  // Trigger re-computation when content changes
}, {
  debounce: props.splitDelay,
})

// Expose utilities for external use
defineExpose({
  splitContent,
  editResult,
  formattedContent,
  contentFinal,
  debouncedLoading,
})
</script>

<template>
  <div
    class="streaming-text-wrapper"
    :class="{ streaming: debouncedLoading }"
  >
    <div
      :class="debouncedLoading ? fadeInClass : ''"
      v-html="contentFinal"
    />
  </div>
</template>

<style scoped>
.streaming-text-wrapper {
  position: relative;
}

.fade-in {
  opacity: 0;
  animation: fadeIn 1s forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
