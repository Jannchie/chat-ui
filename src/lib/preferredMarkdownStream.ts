import type { Ref, VNode } from 'vue'
import {
  createStreamingMarkdownVNodes,

  setCodeBlockComponent,
} from '@preferred-markdown-stream/vue'
import { computed, watch } from 'vue'
// The package's exports map hides its markdown-it instance, but the raw-HTML
// pass-through it enables (html: true) lets LLM output inject live DOM with
// event-handler attributes. Reach into the dist file (same module instance as
// the package's own internals) and disable raw HTML so it renders as text.
// eslint-disable-next-line antfu/no-import-dist, antfu/no-import-node-modules-by-path
import { md } from '../../node_modules/@preferred-markdown-stream/vue/dist/runtime.js'
import MarkdownCodeBlock from '../components/MarkdownCodeBlock.vue'

md.set({ html: false })

interface TriggerableComputed<T> {
  value: T
  trigger: () => void
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

export { createStreamingMarkdownVNodes, createVNodeRendererComponent } from '@preferred-markdown-stream/vue'
