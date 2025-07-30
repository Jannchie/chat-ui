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

function formatTokenUsage(usage: any) {
  const upArrow = '⬆'
  const downArrow = '⬇'
  const input = usage.input_tokens
  const output = usage.output_tokens
  if (input !== undefined && output !== undefined) {
    return `${upArrow} ${input} ${downArrow} ${output} tokens`
  }
  else if (input !== undefined) {
    return `${upArrow} ${input} tokens`
  }
  else if (output !== undefined) {
    return `${downArrow} ${output} tokens`
  }
  else if (usage.total_tokens) {
    return `${usage.total_tokens} tokens`
  }
  return 'DEBUG: EMPTY_USAGE'
}

const cost = asyncComputed(async () => {
  if (props.message.metadata?.cost !== undefined) {
    return props.message.metadata.cost
  }
  if (props.message.metadata?.usage && props.message.metadata?.model) {
    const cost = await calculateTokenCost(props.message.metadata.model, props.message.metadata.usage)
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

const originalCost = computed(() => {
  if (cost.value === null || cost.value === undefined) {
    return null
  }
  return format(cost.value, 'USD')
})
</script>

<template>
  <div
    v-if="message.role === 'assistant' && (message.metadata?.receivedAt || message.metadata?.usage || message.metadata?.tokenSpeed || (message.metadata?.retryCount && message.metadata.retryCount > 0))"
    class="font-condensed flex gap-2 items-center"
  >
    <MessageTimer :message="message" mode="detailed" />
    <Tag v-if="message.metadata?.usage" size="sm" variant="light" color="surface">
      {{ formatTokenUsage(message.metadata.usage) }}
    </Tag>
    <Tag v-if="displayedCost" size="sm" variant="light" color="surface">
      {{ displayedCost }}
    </Tag>
    <Tag v-if="originalCost && displayedCost && displayedCost !== originalCost" size="sm" variant="light" color="surface" style="opacity: 0.5;">
      {{ originalCost }}
    </Tag>
    <Tag v-if="message.metadata?.tokenSpeed" size="sm" variant="light" color="surface">
      {{ message.metadata.tokenSpeed.toFixed(1) }} t/s
    </Tag>
    <Tag v-if="message.metadata?.retryCount && message.metadata.retryCount > 0" size="sm" variant="light" color="surface" style="opacity: 0.5;">
      Retried {{ message.metadata.retryCount }}
    </Tag>
  </div>
</template>
