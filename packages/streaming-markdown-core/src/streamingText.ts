const SENTENCE_SPLIT_REGEXP
  = /(?<=[。？！；、，\n])|(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=[.?!`])/g
const SENTENCE_END_REGEXP = /[.?!。？！；，、`\n]$/
const ORDERED_LIST_PREFIX_REGEXP = /^\d+\./

export interface StreamingTextNode {
  children?: string | StreamingTextNode[] | unknown
  props?: {
    class?: string
    [key: string]: unknown
  } | null
}

/**
 * Smart content splitting to avoid displaying incomplete sentences
 * Supports both English and Chinese punctuation
 */
export function splitContent(msg: string): string {
  const sentences = msg.split(SENTENCE_SPLIT_REGEXP)

  if (
    sentences.length > 0
    && !SENTENCE_END_REGEXP.test(sentences.at(-1)!)
  ) {
    sentences.pop()
  }

  if (sentences.length > 0 && ORDERED_LIST_PREFIX_REGEXP.test(sentences.at(-1)!)) {
    sentences.pop()
  }

  return sentences.join('')
}

/**
 * Add a fade-in class to string-backed nodes in a generic tree structure.
 */
export function addFadeInClassToTreeNodes<T extends StreamingTextNode>(
  childrenRaw: T[],
  loading: boolean,
  fadeInClass = 'fade-in',
): T[] {
  // eslint-disable-next-line unicorn/no-magic-array-flat-depth
  const children = childrenRaw.flat(20) as T[]
  for (const child of children) {
    if (typeof child.children === 'string') {
      child.props = {
        ...child.props,
      }
      if (loading) {
        const existingClass = typeof child.props.class === 'string'
          ? child.props.class
          : ''
        child.props.class = `${existingClass} ${fadeInClass}`.trim()
      }
    }
    if (
      child.children
      && Array.isArray(child.children)
      && child.children.length > 0
    ) {
      addFadeInClassToTreeNodes(child.children as T[], loading, fadeInClass)
    }
  }
  return children
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
