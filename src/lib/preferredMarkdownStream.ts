import type { Ref, VNode } from 'vue'
import {
  createStreamingMarkdownVNodes,
  createVNodeRendererComponent,
  setCodeBlockComponent,
} from '@preferred-markdown-stream/vue'
import { computed, watch } from 'vue'
import MarkdownCodeBlock from '../components/MarkdownCodeBlock.vue'

interface TriggerableComputed<T> {
  value: T
  trigger: () => void
}

export {
  createStreamingMarkdownVNodes,
  createVNodeRendererComponent,
}

setCodeBlockComponent(MarkdownCodeBlock)

export function createReasoningMarkdownVNodes(
  reasoning: Readonly<Ref<string | undefined>>,
  options?: {
    returnEmptyWhenBlank?: boolean
  },
) {
  const normalizedReasoning = computed(() => reasoning.value ?? '')
  const staticLoading = computed(() => false)
  const { contentVNodes } = createStreamingMarkdownVNodes(
    normalizedReasoning,
    staticLoading,
  )

  return {
    get value() {
      if (options?.returnEmptyWhenBlank && !normalizedReasoning.value) {
        return [] as VNode[]
      }

      return contentVNodes.value
    },
    trigger: contentVNodes.trigger,
  }
}

export function bindStreamingMarkdownTrigger(
  vnodes: TriggerableComputed<VNode[]>,
  source: Readonly<Ref<unknown>>,
  debounce = 300,
) {
  let timer: ReturnType<typeof setTimeout> | undefined

  watch(source, () => {
    if (timer !== undefined) {
      clearTimeout(timer)
    }

    timer = setTimeout(() => {
      vnodes.trigger()
    }, debounce)
  })
}
