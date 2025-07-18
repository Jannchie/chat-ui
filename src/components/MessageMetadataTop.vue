<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { Tag } from '@roku-ui/vue'
import { serviceUrl } from '../shared'
import { getPlatformIcon } from '../utils'
import MessageTimer from './MessageTimer.vue'

defineProps<{ message: ChatMessage }>()

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat('sv-SE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

const currentPlatform = computed(() => {
  const url = serviceUrl.value
  if (url?.includes('openai.com')) {
    return 'openai'
  }
  if (url?.includes('anthropic.com')) {
    return 'anthropic'
  }
  if (url?.includes('openrouter.ai')) {
    return 'openrouter'
  }
  if (url?.includes('deepseek.com')) {
    return 'deepseek'
  }
  return 'custom'
})
</script>

<template>
  <div class="flex items-center gap-2 text-xs">
    <span class="op-75">
      {{ formatDate(message.timestamp) }}
    </span>
    <span
      v-if="message.role === 'assistant' && message.metadata?.model"
      class="flex items-center gap-1 op-75"
    >
      <span>·</span>
      <component :is="() => getPlatformIcon(currentPlatform)" class="text-xs" />
      <span>{{ message.metadata.model }}</span>
    </span>
    <MessageTimer :message="message" mode="compact" />
    <Tag
      v-if="message.metadata?.edited"
      size="sm"
      variant="light"
      color="blue"
      style="opacity: 0.5;"
    >
      Edited
    </Tag>
  </div>
</template>
