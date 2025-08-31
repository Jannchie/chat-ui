import type { VNode } from 'vue'

/**
 * Smart content splitting to avoid displaying incomplete sentences
 * Supports both English and Chinese punctuation
 */
export function splitContent(msg: string): string {
  const sentences = msg.split(/(?<=[。？！；、，\n])|(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=[.?!`])/g)

  if (sentences.length > 0 && !/[.?!。？！；，、`\n]$/.test(sentences.at(-1)!)) {
    sentences.pop()
  }

  if (sentences.length > 0 && /^\d+\./.test(sentences.at(-1)!)) {
    sentences.pop()
  }

  return sentences.join('')
}

/**
 * Add fade-in animation class to text nodes in VNode tree
 * This is the core function that enables streaming text animation
 */
export function addFadeInToVNodes(childrenRaw: VNode[], loading: boolean, fadeInClass = 'fade-in'): VNode[] {
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
      addFadeInToVNodes(child.children as VNode[], loading, fadeInClass)
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
