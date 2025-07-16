<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { serviceUrl } from '../shared'
import { getPlatformIcon } from '../utils'

defineProps<{
  message: ChatMessage
  showDetailed?: boolean
}>()

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat('en-UK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(timestamp))
}

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

function getResponseTime(message: ChatMessage) {
  if (message.metadata?.sentAt && message.metadata?.receivedAt) {
    const responseTime = message.metadata.receivedAt - message.metadata.sentAt
    return responseTime < 1000 ? `${responseTime}ms` : `${(responseTime / 1000).toFixed(1)}s`
  }
  return null
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
  <div class="flex items-center gap-2 text-xs text-neutral-4">
    <!-- 时间戳 -->
    <span class="opacity-70">
      {{ formatDate(message.timestamp) }}
    </span>

    <!-- 助手消息的模型信息 - 显示在时间旁边 -->
    <span
      v-if="message.role === 'assistant' && message.metadata?.model"
      class="flex items-center gap-1 text-neutral-5 opacity-60 dark:text-neutral-4"
    >
      <span>·</span>
      <component :is="() => getPlatformIcon(currentPlatform)" class="text-xs" />
      <span>{{ message.metadata.model }}</span>
    </span>

    <!-- 响应时间 -->
    <span
      v-if="message.role === 'assistant' && getResponseTime(message)"
      class="rounded bg-green-1 px-1.5 py-0.5 text-green-6 opacity-50 dark:bg-green-9 dark:text-green-4"
    >
      {{ getResponseTime(message) }}
    </span>

    <!-- 重试次数 -->
    <span
      v-if="message.metadata?.retryCount && message.metadata.retryCount > 0"
      class="rounded bg-yellow-1 px-1.5 py-0.5 text-yellow-6 opacity-50 dark:bg-yellow-9 dark:text-yellow-4"
    >
      重试 {{ message.metadata.retryCount }}
    </span>

    <!-- 编辑标识 -->
    <span
      v-if="message.metadata?.edited"
      class="rounded bg-blue-1 px-1.5 py-0.5 text-blue-6 opacity-50 dark:bg-blue-9 dark:text-blue-4"
    >
      已编辑
    </span>

    <!-- 详细信息展开 -->
    <div v-if="showDetailed" class="flex items-center gap-2 opacity-50">
      <span v-if="message.metadata?.sentAt">
        发送: {{ formatTime(message.metadata.sentAt) }}
      </span>
      <span v-if="message.metadata?.receivedAt">
        收到: {{ formatTime(message.metadata.receivedAt) }}
      </span>
      <span>
        ID: {{ message.id.slice(-8) }}
      </span>
    </div>
  </div>
</template>
