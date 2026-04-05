import type { Ref, VNode } from 'vue'
import { computed, defineComponent } from 'vue'
import {
  computedWithControl,
  debouncedWatch,
  refDebounced,
} from '@vueuse/core'
import { splitContent } from 'streaming-markdown-core'
import { addFadeInToVNodes } from './fadeIn'
import {
  isKatexLoaded,
  isShikiLoaded,
  loadKatex,
  loadShiki,
  md,
} from './runtime'

interface TriggerableComputed<T> {
  value: T
  trigger: () => void
}

function ensureMarkdownCapabilities(content: string) {
  if (content.includes('```') || content.includes('`')) {
    loadShiki()
  }

  if (
    content.includes('$')
    || content.includes(String.raw`\(`)
    || content.includes(String.raw`\[`)
  ) {
    loadKatex()
  }
}

function renderMarkdown(content: string) {
  ensureMarkdownCapabilities(content)
  return md.render(content, {
    sanitize: true,
  }) as unknown as VNode[]
}

export function createStreamingMarkdownVNodes(
  content: Readonly<Ref<string>>,
  loading: Readonly<Ref<boolean>>,
) {
  const debouncedLoading = refDebounced(loading, 1000)
  const formattedContent = computed(() => splitContent(content.value))
  const contentFinal = computed(() =>
    loading.value ? formattedContent.value : content.value,
  )

  const contentVNodes = computedWithControl(
    () => [isShikiLoaded.value, isKatexLoaded.value, contentFinal.value],
    () => {
      const currentContent = contentFinal.value ?? ''
      const rendered = renderMarkdown(currentContent)
      return addFadeInToVNodes(rendered, debouncedLoading.value)
    },
  )

  return {
    contentFinal,
    contentVNodes,
    debouncedLoading,
    formattedContent,
  }
}

export function createReasoningMarkdownVNodes(
  reasoning: Readonly<Ref<string | undefined>>,
  options?: {
    returnEmptyWhenBlank?: boolean
  },
) {
  return computedWithControl([reasoning], () => {
    const reasoningContent = reasoning.value ?? ''

    if (options?.returnEmptyWhenBlank && !reasoningContent) {
      return []
    }

    return renderMarkdown(reasoningContent)
  })
}

export function createVNodeRendererComponent(vnodes: { value: VNode[] }) {
  return defineComponent({
    setup() {
      return () => vnodes.value
    },
  })
}

export function bindStreamingMarkdownTrigger(
  vnodes: TriggerableComputed<VNode[]>,
  source: Readonly<Ref<unknown>>,
  debounce = 300,
) {
  debouncedWatch(
    [source],
    () => {
      vnodes.trigger()
    },
    {
      debounce,
    },
  )
}
