<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { Tag } from '@roku-ui/vue'
import { asyncComputed } from '@vueuse/core'
import { computed } from 'vue'
import { useCurrency } from '../composables/useCurrency'
import { calculateTokenCost } from '../utils/remotePricing'
import MessageTimer from './MessageTimer.vue'

const props = defineProps<{ message: ChatMessage }>()

const { selectedCurrency, convert, format } = useCurrency()

const cost = asyncComputed(async () => {
  if (props.message.metadata?.cost !== undefined) {
    return props.message.metadata.cost
  }
  if (props.message.metadata?.usage && props.message.metadata?.model) {
    const cost = await calculateTokenCost(
      props.message.metadata.model,
      props.message.metadata.usage,
    )
    return cost?.totalCost
  }
  return null
})

const displayedCost = computed(() => {
  if (cost.value === null || cost.value === undefined) {
    return null
  }
  const convertedCost = convert(cost.value, 'USD', selectedCurrency.value)
  if (convertedCost === null) {
    return format(cost.value, 'USD')
  }
  return format(convertedCost, selectedCurrency.value)
})

function formatMs(ms: number) {
  return ms < 1000 ? `${ms.toFixed(0)}ms` : `${(ms / 1000).toFixed(2)}s`
}

const performanceStats = computed(() => {
  const perf = props.message.metadata?.performance
  if (!perf) {
    return []
  }
  const stats: { label: string, value: string }[] = []
  if (perf.timeToFirstOutputMs !== undefined) {
    stats.push({ label: 'First output', value: formatMs(perf.timeToFirstOutputMs) })
  }
  if (perf.responseTimeMs !== undefined) {
    stats.push({ label: 'Response time', value: formatMs(perf.responseTimeMs) })
  }
  if (perf.outputTokensPerSecond !== undefined) {
    stats.push({ label: 'Output speed', value: `${perf.outputTokensPerSecond.toFixed(1)} t/s` })
  }
  if (perf.effectiveOutputTokensPerSecond !== undefined) {
    stats.push({ label: 'Effective speed', value: `${perf.effectiveOutputTokensPerSecond.toFixed(1)} t/s` })
  }
  if (perf.chunkGapMs) {
    stats.push({ label: 'Chunk gap p50 / p90', value: `${perf.chunkGapMs.median.toFixed(0)} / ${perf.chunkGapMs.p90.toFixed(0)}ms` })
  }
  return stats
})
</script>

<template>
  <div
    v-if="
      message.role === 'assistant'
        && (message.metadata?.receivedAt
          || message.metadata?.usage
          || message.metadata?.tokenSpeed)
    "
    class="font-condensed flex gap-2 items-center"
  >
    <MessageTimer :message="message" mode="detailed" />
    <Tag
      v-if="message.metadata?.usage"
      size="sm"
      variant="light"
      color="surface"
    >
      <template #leftSection>
        <span class="flex gap-0.5 items-center">
          <i class="i-tabler-arrow-up h-3 w-3" />
          <span>{{ message.metadata.usage.input_tokens }}</span>
          <i class="i-tabler-arrow-down ml-0.5 h-3 w-3" />
          <span>{{ message.metadata.usage.output_tokens }}</span>
          <template v-if="message.metadata.usage.reasoning_tokens && message.metadata.usage.reasoning_tokens > 0">
            <i class="i-tabler-message ml-1 h-3 w-3" />
            <span>{{ message.metadata.usage.text_tokens ?? (message.metadata.usage.output_tokens - message.metadata.usage.reasoning_tokens) }}</span>
            <i class="i-tabler-brain ml-0.5 h-3 w-3" />
            <span>{{ message.metadata.usage.reasoning_tokens }}</span>
          </template>
        </span>
      </template>
    </Tag>
    <Tag
      v-if="message.metadata?.usage?.cached_input_tokens && message.metadata.usage.cached_input_tokens > 0"
      size="sm"
      variant="light"
      color="surface"
    >
      <template #leftSection>
        <i class="i-tabler-bolt h-3 w-3" />
      </template>
      {{ message.metadata.usage.cached_input_tokens }}
    </Tag>
    <Tag v-if="displayedCost" size="sm" variant="light" color="surface">
      {{ displayedCost }}
    </Tag>
    <div
      v-if="message.metadata?.tokenSpeed"
      class="group relative"
      :class="{ 'cursor-help': performanceStats.length > 0 }"
    >
      <Tag size="sm" variant="light" color="surface">
        <template #leftSection>
          <i class="i-tabler-gauge h-3 w-3" />
        </template>
        {{ message.metadata.tokenSpeed.toFixed(1) }} t/s
      </Tag>
      <div
        v-if="performanceStats.length > 0"
        class="mb-1.5 opacity-0 invisible pointer-events-none transition-opacity duration-150 bottom-full left-0 absolute z-10 group-hover:opacity-100 group-hover:visible"
      >
        <div
          class="text-xs px-3 py-2 border border-neutral-200 rounded-lg bg-white gap-x-4 gap-y-1 grid grid-cols-[auto_auto] whitespace-nowrap shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
        >
          <template v-for="stat in performanceStats" :key="stat.label">
            <span class="text-neutral-500 dark:text-neutral-400">{{ stat.label }}</span>
            <span class="text-neutral-800 font-mono text-right dark:text-neutral-100">{{ stat.value }}</span>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
