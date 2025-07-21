<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { Tag } from '@roku-ui/vue'
import { calculateTokenCost, formatCost } from '../utils/remotePricing'
import MessageTimer from './MessageTimer.vue'

const props = defineProps<{ message: ChatMessage }>()

// 响应式的价格计算缓存
const tokenCostCache = ref<Map<string, string | null>>(new Map())

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

// 响应式的价格显示
const displayedCost = ref<string | null>(null)

// 异步计算价格
async function updateTokenCost() {
  // 优先使用 API 提供的 cost
  if (props.message.metadata?.cost !== undefined) {
    displayedCost.value = formatCost(props.message.metadata.cost)
    return
  }

  // 如果没有 cost，尝试异步计算
  if (!props.message.metadata?.usage || !props.message.metadata?.model) {
    displayedCost.value = null
    return
  }

  const cacheKey = `${props.message.metadata.model}-${JSON.stringify(props.message.metadata.usage)}`

  // 检查缓存
  if (tokenCostCache.value.has(cacheKey)) {
    displayedCost.value = tokenCostCache.value.get(cacheKey) || null
    return
  }

  try {
    const cost = await calculateTokenCost(props.message.metadata.model, props.message.metadata.usage)
    const formattedCost = cost ? formatCost(cost.totalCost) : null

    // 缓存结果
    tokenCostCache.value.set(cacheKey, formattedCost)
    displayedCost.value = formattedCost
  }
  catch (error) {
    console.error('Failed to calculate token cost:', error)
    tokenCostCache.value.set(cacheKey, null)
    displayedCost.value = null
  }
}

// 监听消息变化并更新价格
watchEffect(() => {
  updateTokenCost()
})
</script>

<template>
  <div v-if="message.role === 'assistant' && (message.metadata?.receivedAt || message.metadata?.usage || message.metadata?.tokenSpeed || (message.metadata?.retryCount && message.metadata.retryCount > 0))" class="flex items-center gap-2">
    <MessageTimer :message="message" mode="detailed" />
    <Tag v-if="message.metadata?.usage" size="sm" variant="light" color="#0d8d9e">
      {{ formatTokenUsage(message.metadata.usage) }}
    </Tag>
    <Tag v-if="displayedCost" size="sm" variant="light" color="#10b981">
      {{ displayedCost }}
    </Tag>
    <Tag v-if="message.metadata?.tokenSpeed" size="sm" variant="light" color="#2680ca">
      {{ message.metadata.tokenSpeed.toFixed(1) }} t/s
    </Tag>
    <Tag v-if="message.metadata?.retryCount && message.metadata.retryCount > 0" size="sm" variant="light" color="#f59e0b" style="opacity: 0.5;">
      Retried {{ message.metadata.retryCount }}
    </Tag>
  </div>
</template>
