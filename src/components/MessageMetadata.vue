<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { vAutoAnimate } from '@formkit/auto-animate'
import { Tag } from '@roku-ui/vue'
import { serviceUrl } from '../shared'
import { getPlatformIcon } from '../utils'

defineProps<{
  message: ChatMessage
  showDetailed?: boolean
  position?: 'top' | 'bottom' // 新增位置参数
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
  <div class="text-neutral-4 text-xs">
    <!-- 顶部 metadata：执行前/执行中的信息 -->
    <div v-if="!position || position === 'top'" class="flex flex-col gap-1 sm:flex-row sm:gap-2 sm:items-center">
      <!-- 基本信息（时间和模型） -->
      <div class="flex gap-2 items-center">
        <!-- 时间戳 -->
        <span>
          {{ formatDate(message.timestamp) }}
        </span>

        <!-- 助手消息的模型信息 - 显示在时间旁边 -->
        <span
          v-if="message.role === 'assistant' && message.metadata?.model"
          class="text-neutral-5 dark:text-neutral-4 flex gap-1 items-center"
        >
          <span>·</span>
          <component :is="() => getPlatformIcon(currentPlatform)" class="text-xs" />
          <span>{{ message.metadata.model }}</span>
        </span>

        <!-- 动态时间显示 (消息进行中或已完成) -->
        <MessageTimer :message="message" mode="compact" />

        <!-- 编辑标识 -->
        <Tag
          v-if="message.metadata?.edited"
          size="sm"
          variant="light"
          color="#f59e0b"
          style="opacity: 0.5;"
        >
          Edited
        </Tag>
      </div>
    </div>

    <!-- 底部 metadata：执行完毕后的性能指标 -->
    <div v-if="position === 'bottom'" v-auto-animate class="flex flex-col gap-1 sm:flex-row sm:gap-2 sm:items-center">
      <div
        v-if="message.role === 'assistant' && (message.metadata?.receivedAt || message.metadata?.usage || message.metadata?.tokenSpeed || (message.metadata?.retryCount && message.metadata.retryCount > 0))"
        class="flex gap-2 items-center"
      >
        <!-- 响应时间 (消息已完成) -->
        <MessageTimer :message="message" mode="detailed" />

        <!-- Token 使用量 -->
        <Tag
          v-if="message.metadata?.usage"
          size="sm"
          variant="light"
          color="#3d79d3"
        >
          {{ formatTokenUsage(message.metadata.usage) }}
        </Tag>

        <!-- Token 速度 -->
        <Tag
          v-if="message.metadata?.tokenSpeed"
          size="sm"
          variant="light"
          color="#ce9d41"
        >
          {{ message.metadata.tokenSpeed.toFixed(1) }} t/s
        </Tag>

        <!-- 重试次数 -->
        <Tag
          v-if="message.metadata?.retryCount && message.metadata.retryCount > 0"
          size="sm"
          variant="light"
          color="yellow"
          style="opacity: 0.5;"
        >
          Retried {{ message.metadata.retryCount }}
        </Tag>
      </div>
    </div>

    <!-- 详细信息展开 -->
    <div v-if="showDetailed" class="mt-1 opacity-50 flex gap-2 items-center">
      <Tag v-if="message.metadata?.sentAt" size="sm" variant="light" color="gray">
        发送: {{ formatTime(message.metadata.sentAt) }}
      </Tag>
      <Tag v-if="message.metadata?.receivedAt" size="sm" variant="light" color="gray">
        收到: {{ formatTime(message.metadata.receivedAt) }}
      </Tag>
      <Tag v-if="message.metadata?.usage" size="sm" variant="light" color="blue">
        Token: {{ formatTokenUsage(message.metadata.usage) }}
      </Tag>
      <Tag size="sm" variant="light" color="gray">
        ID: {{ message.id.slice(-8) }}
      </Tag>
    </div>
  </div>
</template>
