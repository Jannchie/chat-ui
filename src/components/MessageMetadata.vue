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

function formatTokenUsage(usage: any) {
  // 使用箭头图标区分 input_tokens 和 output_tokens
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
  <div class="text-xs text-neutral-4">
    <!-- 大屏幕下为单行，小屏幕下为多行 -->
    <div class="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
      <!-- 第一行：基本信息（时间和模型） -->
      <div class="flex items-center gap-2">
        <!-- 时间戳 -->
        <span>
          {{ formatDate(message.timestamp) }}
        </span>

        <!-- 助手消息的模型信息 - 显示在时间旁边 -->
        <span
          v-if="message.role === 'assistant' && message.metadata?.model"
          class="flex items-center gap-1 text-neutral-5 dark:text-neutral-4"
        >
          <span>·</span>
          <component :is="() => getPlatformIcon(currentPlatform)" class="text-xs" />
          <span>{{ message.metadata.model }}</span>
        </span>

        <!-- 编辑标识 -->
        <span
          v-if="message.metadata?.edited"
          class="rounded bg-blue-1 px-1.5 py-0.5 text-blue-6 opacity-50 dark:bg-blue-9 dark:text-blue-4"
        >
          Edited
        </span>
      </div>

      <!-- 第二行：性能指标 -->
      <div
        v-if="message.role === 'assistant' && (getResponseTime(message) || message.metadata?.usage || message.metadata?.tokenSpeed || (message.metadata?.retryCount && message.metadata.retryCount > 0))"
        class="flex items-center gap-2"
      >
        <!-- 响应时间 -->
        <span
          v-if="getResponseTime(message)"
          class="rounded bg-green-1 px-1.5 py-0.5 text-green-6 dark:bg-green-9 dark:text-green-4"
        >
          {{ getResponseTime(message) }}
        </span>

        <!-- Token 使用量 -->
        <span
          v-if="message.metadata?.usage"
          class="rounded bg-blue-1 px-1.5 py-0.5 text-blue-6 dark:bg-blue-9 dark:text-blue-4"
        >
          {{ formatTokenUsage(message.metadata.usage) }}
        </span>

        <!-- Token 速度 -->
        <span
          v-if="message.metadata?.tokenSpeed"
          class="rounded bg-purple-1 px-1.5 py-0.5 text-purple-6 dark:bg-purple-9 dark:text-purple-4"
        >
          {{ message.metadata.tokenSpeed.toFixed(1) }} t/s
        </span>

        <!-- 重试次数 -->
        <span
          v-if="message.metadata?.retryCount && message.metadata.retryCount > 0"
          class="rounded bg-yellow-1 px-1.5 py-0.5 text-yellow-6 opacity-50 dark:bg-yellow-9 dark:text-yellow-4"
        >
          Retried {{ message.metadata.retryCount }}
        </span>
      </div>
    </div>

    <!-- 详细信息展开 -->
    <div v-if="showDetailed" class="mt-1 flex items-center gap-2 opacity-50">
      <span v-if="message.metadata?.sentAt">
        发送: {{ formatTime(message.metadata.sentAt) }}
      </span>
      <span v-if="message.metadata?.receivedAt">
        收到: {{ formatTime(message.metadata.receivedAt) }}
      </span>
      <span v-if="message.metadata?.usage">
        Token: {{ formatTokenUsage(message.metadata.usage) }}
      </span>
      <span>
        ID: {{ message.id.slice(-8) }}
      </span>
    </div>
  </div>
</template>
