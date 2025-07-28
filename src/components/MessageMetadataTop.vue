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
  <div class="text-xs font-condensed flex gap-2 items-center">
    <span class="op-75">
      {{ formatDate(message.timestamp) }}
    </span>
    <span
      v-if="message.role === 'assistant' && message.metadata?.model"
      class="op-75 flex gap-1 items-center"
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
