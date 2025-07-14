<script setup lang="ts">
import type { UIMessage } from '../types/message'

defineProps<{
  message: UIMessage
  showDetailed?: boolean
}>()

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  
  if (messageDate.getTime() === today.getTime()) {
    return formatTime(timestamp)
  } else if (messageDate.getTime() === today.getTime() - 24 * 60 * 60 * 1000) {
    return `昨天 ${formatTime(timestamp)}`
  } else {
    return date.toLocaleDateString()
  }
}

const getResponseTime = (message: UIMessage) => {
  if (message.metadata?.sentAt && message.metadata?.receivedAt) {
    const responseTime = message.metadata.receivedAt - message.metadata.sentAt
    return responseTime < 1000 ? `${responseTime}ms` : `${(responseTime / 1000).toFixed(1)}s`
  }
  return null
}

</script>

<template>
  <div class="text-xs text-neutral-4 flex items-center gap-2">
    <!-- 时间戳 -->
    <span class="opacity-70">
      {{ formatDate(message.timestamp) }}
    </span>

    <!-- 助手消息的模型信息 - 显示在时间旁边 -->
    <span
      v-if="message.role === 'assistant' && message.metadata?.model"
      class="opacity-60 text-neutral-5 dark:text-neutral-4"
    >
      · {{ message.metadata.model }}
    </span>

    <!-- 响应时间 -->
    <span
      v-if="message.role === 'assistant' && getResponseTime(message)"
      class="opacity-50 px-1.5 py-0.5 rounded bg-green-1 dark:bg-green-9 text-green-6 dark:text-green-4"
    >
      {{ getResponseTime(message) }}
    </span>

    <!-- 重试次数 -->
    <span
      v-if="message.metadata?.retryCount && message.metadata.retryCount > 0"
      class="opacity-50 px-1.5 py-0.5 rounded bg-yellow-1 dark:bg-yellow-9 text-yellow-6 dark:text-yellow-4"
    >
      重试 {{ message.metadata.retryCount }}
    </span>

    <!-- 编辑标识 -->
    <span
      v-if="message.metadata?.edited"
      class="opacity-50 px-1.5 py-0.5 rounded bg-blue-1 dark:bg-blue-9 text-blue-6 dark:text-blue-4"
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