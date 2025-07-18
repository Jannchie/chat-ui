<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { Tag } from '@roku-ui/vue'
import MessageTimer from './MessageTimer.vue'

defineProps<{ message: ChatMessage }>()

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
</script>

<template>
  <div v-if="message.role === 'assistant' && (message.metadata?.receivedAt || message.metadata?.usage || message.metadata?.tokenSpeed || (message.metadata?.retryCount && message.metadata.retryCount > 0))" class="flex items-center gap-2">
    <MessageTimer :message="message" mode="detailed" />
    <Tag v-if="message.metadata?.usage" size="sm" variant="light" color="#0d8d9e">
      {{ formatTokenUsage(message.metadata.usage) }}
    </Tag>
    <Tag v-if="message.metadata?.tokenSpeed" size="sm" variant="light" color="#2680ca">
      {{ message.metadata.tokenSpeed.toFixed(1) }} t/s
    </Tag>
    <Tag v-if="message.metadata?.retryCount && message.metadata.retryCount > 0" size="sm" variant="light" color="#f59e0b" style="opacity: 0.5;">
      Retried {{ message.metadata.retryCount }}
    </Tag>
  </div>
</template>
