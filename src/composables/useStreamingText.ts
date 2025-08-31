import type { Ref, VNode } from 'vue'
import { computed } from 'vue'

export interface UseStreamingTextOptions {
  debounceDelay?: number
  splitDelay?: number
  fadeInClass?: string
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

/**
 * Composable for streaming text with fade-in animation
 * Provides utilities for text splitting and VNode manipulation
 */
export function useStreamingText(options: UseStreamingTextOptions = {}) {
  const {
    debounceDelay = 1000,
    fadeInClass = 'fade-in',
  } = options

  /**
   * Add fade-in animation class to text nodes in VNode tree
   * This is the core function that enables streaming text animation
   */
  function editResult(childrenRaw: VNode[], loading: boolean): VNode[] {
    // eslint-disable-next-line unicorn/no-magic-array-flat-depth
    const children = childrenRaw.flat(20)
    for (const child of children) {
      if (typeof child.children === 'string') {
        child.props = {
          ...child.props,
        }
        if (loading) {
          const existingClass = child.props.class || ''
          child.props.class = `${existingClass} ${fadeInClass}`.trim()
        }
      }
      if (child.children && Array.isArray(child.children) && child.children.length > 0) {
        editResult(child.children as VNode[], loading)
      }
    }
    return children
  }

  /**
   * Create reactive streaming text state
   */
  function createStreamingState(initialContent = '', initialLoading = false) {
    const content = ref(initialContent)
    const loading = ref(initialLoading)
    const debouncedLoading = refDebounced(loading, debounceDelay)

    const formattedContent = computed(() => {
      return splitContent(content.value)
    })

    const contentFinal = computed(() => {
      return loading.value ? formattedContent.value : content.value
    })

    function updateContent(newContent: string) {
      content.value = newContent
    }

    function setLoading(isLoading: boolean) {
      loading.value = isLoading
    }

    return {
      content: readonly(content),
      loading: readonly(loading),
      debouncedLoading: readonly(debouncedLoading),
      formattedContent: readonly(formattedContent),
      contentFinal: readonly(contentFinal),
      updateContent,
      setLoading,
    }
  }

  /**
   * Create streaming content computeds for a given content source
   */
  function createStreamingContent(content: Ref<string>, loading: Ref<boolean>) {
    const formattedContent = computed(() => {
      return splitContent(content.value)
    })

    const contentFinal = computed(() => {
      return loading.value ? formattedContent.value : content.value
    })

    return {
      formattedContent,
      contentFinal,
    }
  }

  return {
    editResult,
    splitContent,
    createStreamingState,
    createStreamingContent,
    fadeInClass,
  }
}

/**
 * CSS styles for streaming text animation
 * Can be used in your global styles or component styles
 */
export const streamingTextStyles = `
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

.streaming-text-wrapper {
  position: relative;
}

.streaming-text-wrapper.streaming {
  /* Additional styling for streaming state */
}
`
