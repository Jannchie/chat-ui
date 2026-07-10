<script setup lang="ts">
import { ref } from 'vue'
import {
  bindStreamingMarkdownTrigger,
  createReasoningMarkdownVNodes,
  createVNodeRendererComponent,
} from '../lib/preferredMarkdownStream'

const props = withDefaults(
  defineProps<{
    reasoning?: string
    // 等待响应或推理仍在流式输出中
    active?: boolean
    startedAt?: number
    endedAt?: number
  }>(),
  {
    reasoning: '',
    active: false,
  },
)

const expanded = ref(false)

const reasoning = computed(() => props.reasoning)
const reasoningVNodes = createReasoningMarkdownVNodes(reasoning, {
  returnEmptyWhenBlank: true,
})
const ThinkingMarkdown = createVNodeRendererComponent(reasoningVNodes)
bindStreamingMarkdownTrigger(reasoningVNodes, reasoning)

const hasContent = computed(() => props.reasoning.length > 0)

// 当 metadata 里没有时间戳时（如翻译页），用组件本地计时兜底
const localStartedAt = ref(0)
const localEndedAt = ref(0)
watch(
  () => props.active,
  (active, wasActive) => {
    if (active && localStartedAt.value === 0) {
      localStartedAt.value = Date.now()
    }
    if (!active && wasActive && localStartedAt.value > 0 && localEndedAt.value === 0) {
      localEndedAt.value = Date.now()
    }
  },
  { immediate: true },
)

const startedAt = computed(() => props.startedAt ?? (localStartedAt.value || undefined))
const endedAt = computed(() => props.endedAt ?? (localEndedAt.value || undefined))

// active 时驱动实时计时
const now = ref(Date.now())
let intervalId: ReturnType<typeof setInterval> | null = null
watch(
  () => props.active,
  (active) => {
    if (active && !intervalId) {
      intervalId = setInterval(() => {
        now.value = Date.now()
      }, 100)
    }
    else if (!active && intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  },
  { immediate: true },
)
onBeforeUnmount(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})

const durationText = computed(() => {
  const start = startedAt.value
  if (!start) {
    return null
  }
  const end = props.active ? now.value : endedAt.value
  if (!end || end < start) {
    return null
  }
  const seconds = (end - start) / 1000
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`
  }
  return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`
})

function toggle() {
  if (hasContent.value) {
    expanded.value = !expanded.value
  }
}
</script>

<template>
  <div
    v-if="active || hasContent"
    class="mb-4 overflow-hidden border border-neutral-300/60 rounded-xl dark:border-neutral-700/60"
  >
    <button
      type="button"
      class="w-full flex items-center gap-2 bg-neutral-200/50 px-4 py-2.5 text-xs dark:bg-neutral-800/50"
      :class="hasContent ? 'cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-800' : 'cursor-default'"
      :aria-expanded="expanded"
      @click="toggle"
    >
      <i
        class="i-tabler-brain h-4 w-4 shrink-0 text-neutral-500 dark:text-neutral-400"
        :class="{ 'animate-pulse': active }"
      />
      <span v-if="active" class="animate-gradient-text">
        Thinking{{ durationText ? ` · ${durationText}` : '...' }}
      </span>
      <span v-else class="text-neutral-500 dark:text-neutral-400">
        {{ durationText ? `Thought for ${durationText}` : 'Thoughts' }}
      </span>
      <i
        v-if="hasContent"
        class="i-tabler-chevron-down ml-auto h-3.5 w-3.5 shrink-0 text-neutral-400 transition-transform duration-200"
        :class="{ 'rotate-180': expanded }"
      />
    </button>
    <div
      v-if="hasContent"
      v-show="expanded"
      class="max-h-80 max-w-none overflow-auto border-t border-neutral-300/60 px-4 py-3 text-xs prose prose-gray dark:border-neutral-700/60 dark:prose-invert"
    >
      <ThinkingMarkdown />
    </div>
  </div>
</template>

<style>
:root {
  --thinking-text-fallback-color: #52525b;
  --thinking-text-gradient: linear-gradient(
    90deg,
    #606368 0%,
    #a6a9af 15%,
    #ffffff 30%,
    #ffffff 50%,
    #a6a9af 70%,
    #606368 85%,
    #606368 100%
  );
}

:root[data-scheme="dark"] {
  --thinking-text-fallback-color: #e5e7eb;
  --thinking-text-gradient: linear-gradient(
    90deg,
    #9ca3af 0%,
    #d1d5db 25%,
    #f9fafb 50%,
    #d1d5db 75%,
    #9ca3af 100%
  );
}

/* 灰色到白色的渐变文本动画 */
.animate-gradient-text {
  animation: gradient-text 1s linear infinite;
  color: var(--thinking-text-fallback-color);
  display: inline-block;
}

@supports ((-webkit-background-clip: text) or (background-clip: text)) {
  .animate-gradient-text {
    color: transparent;
    background: var(--thinking-text-gradient);
    background-size: 300% 100%;
    background-position: 0% 50%;
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

@keyframes gradient-text {
  0% {
    background-position: 300% 50%;
  }
  100% {
    background-position: 0% 50%;
  }
}
</style>
