<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { Tag } from '@roku-ui/vue'

const props = defineProps<{
  message: ChatMessage
  mode?: 'compact' | 'detailed' // compact: 显示单个时间, detailed: 显示详细时间分解
}>()

// 动态时间显示功能
function useDynamicTime(message: ChatMessage) {
  const dynamicTime = ref<string | null>(null)
  let intervalId: ReturnType<typeof setInterval> | null = null

  const stopTimer = () => {
    if (intervalId) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  const startTimer = () => {
    if (!intervalId && message.metadata?.sentAt && !message.metadata?.receivedAt) {
      intervalId = setInterval(() => {
        // 使用当前的 props 值，而不是闭包中的 message
        if (props.message.metadata?.sentAt && !props.message.metadata?.receivedAt) {
          const elapsed = Date.now() - props.message.metadata.sentAt
          dynamicTime.value = elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`
        }
        else {
          stopTimer()
        }
      }, 100)
    }
  }

  const setFinalTime = () => {
    if (message.metadata?.sentAt && message.metadata?.receivedAt) {
      stopTimer()

      const finalTime = message.metadata.receivedAt - message.metadata.sentAt
      dynamicTime.value = finalTime < 1000 ? `${finalTime}ms` : `${(finalTime / 1000).toFixed(1)}s`
    }
  }

  // 监听消息状态变化
  watch(
    () => [message.metadata?.sentAt, message.metadata?.receivedAt],
    ([sentAt, receivedAt]) => {
      if (sentAt && receivedAt) {
        // 消息已完成，设置最终时间
        setFinalTime()
      }
      else if (sentAt && !receivedAt) {
        // 消息进行中，开始定时器
        startTimer()
      }
      else {
        // 重置状态
        stopTimer()
        dynamicTime.value = null
      }
    },
    { immediate: true },
  )

  // 组件卸载时清除定时器
  onBeforeUnmount(() => {
    stopTimer()
  })

  return dynamicTime
}

// 格式化时间的工具函数
const formatTime = (time: number) => time < 1000 ? `${time}ms` : `${(time / 1000).toFixed(1)}s`

// 使用计时器逻辑
const dynamicTime = useDynamicTime(props.message)

// 计算各种时间
function getTimings(message: ChatMessage) {
  if (!message.metadata?.sentAt) {
    return null
  }

  const sentAt = message.metadata.sentAt
  const firstTokenAt = message.metadata.firstTokenAt
  const receivedAt = message.metadata.receivedAt

  // 如果消息还在进行中，计算已经经过的时间
  if (!receivedAt) {
    const elapsed = Date.now() - sentAt
    return {
      current: elapsed < 1000 ? `${elapsed}ms` : `${(elapsed / 1000).toFixed(1)}s`,
      isCompleted: false,
    }
  }

  // 消息已完成，计算各个时间段
  const totalTime = receivedAt - sentAt

  let latencyTime = 0 // 延迟时间（发起到第一个token）
  let outputTime = 0 // 输出时间（第一个token到结束）

  if (firstTokenAt) {
    latencyTime = firstTokenAt - sentAt
    outputTime = receivedAt - firstTokenAt
  }

  return {
    total: formatTime(totalTime),
    latency: firstTokenAt ? formatTime(latencyTime) : null,
    output: firstTokenAt ? formatTime(outputTime) : null,
    isCompleted: true,
  }
}
</script>

<template>
  <div v-if="message.role === 'assistant'" class="flex gap-1 items-center">
    <!-- 紧凑模式：显示单个时间 -->
    <template v-if="!mode || mode === 'compact'">
      <!-- 动态时间显示 (消息进行中) -->
      <Tag
        v-if="dynamicTime && !message.metadata?.receivedAt"
        size="sm"
        variant="light"
        color="#f59e0b"
      >
        <template #leftSection>
          <i class="i-tabler-loader h-3 w-3" />
        </template>
        {{ dynamicTime }}
      </Tag>

      <!-- 总时间显示 (消息已完成) -->
      <Tag
        v-else-if="getTimings(message)?.isCompleted"
        size="sm"
        variant="light"
        color="#10b981"
      >
        <template #leftSection>
          <i class="i-tabler-check h-3 w-3" />
        </template>
        {{ getTimings(message)?.total }}
      </Tag>
    </template>

    <!-- 详细模式：显示延迟时间和输出时间 -->
    <template v-else-if="mode === 'detailed' && getTimings(message)?.isCompleted">
      <div class="flex gap-2 items-center">
        <!-- 延迟时间 -->
        <Tag
          v-if="getTimings(message)?.latency"
          size="sm"
          variant="light"
          color="#da9732"
          :title="`latency time: ${getTimings(message)?.latency}`"
        >
          <template #leftSection>
            <i class="i-tabler-clock h-3 w-3" />
          </template>
          {{ getTimings(message)?.latency }}
        </Tag>

        <Tag
          v-if="getTimings(message)?.output"
          size="sm"
          variant="light"
          color="#15b39e"
          :title="`output time: ${getTimings(message)?.output}`"
        >
          <template #leftSection>
            <i class="i-tabler-bolt h-3 w-3" />
          </template>
          {{ getTimings(message)?.output }}
        </Tag>
      </div>
    </template>
  </div>
</template>
