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

const performanceTooltip = computed(() => {
  const perf = props.message.metadata?.performance
  if (!perf) {
    return
  }
  const lines: string[] = []
  if (perf.timeToFirstOutputMs !== undefined) {
    lines.push(`TTFT: ${(perf.timeToFirstOutputMs / 1000).toFixed(2)}s`)
  }
  if (perf.outputTokensPerSecond !== undefined) {
    lines.push(`Output: ${perf.outputTokensPerSecond.toFixed(1)} t/s`)
  }
  if (perf.effectiveOutputTokensPerSecond !== undefined) {
    lines.push(`Effective: ${perf.effectiveOutputTokensPerSecond.toFixed(1)} t/s`)
  }
  if (perf.chunkGapMs) {
    lines.push(`Chunk gap: p50 ${perf.chunkGapMs.median.toFixed(0)}ms / p90 ${perf.chunkGapMs.p90.toFixed(0)}ms / max ${perf.chunkGapMs.max.toFixed(0)}ms`)
  }
  return lines.length > 0 ? lines.join('\n') : undefined
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
    <Tag
      v-if="message.metadata?.tokenSpeed"
      size="sm"
      variant="light"
      color="surface"
      :title="performanceTooltip"
    >
      {{ message.metadata.tokenSpeed.toFixed(1) }} t/s
    </Tag>
  </div>
</template>
