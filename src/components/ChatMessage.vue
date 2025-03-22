<script setup lang="ts">
import type { ChatMessage } from '../composables/useHelloWorld'

const props = defineProps<{
  message: ChatMessage
  loading: boolean
}>()
const message = computed(() => props.message)
</script>

<template>
  <div
    class="m-auto w-full flex-grow-1 px-3 py-4 md:max-w-712px md:px-4 md:py-6"
    :class="{
      'bg-neutral-8 rounded-t-xl': message.role === 'user',
      'bg-neutral-9 rounded-b-xl mb-2': message.role === 'assistant',
    }"
  >
    <!-- 移动端上下结构布局（图标+文字在上，内容在下） -->
    <div
      class="block md:hidden"
    >
      <div class="mb-1 flex items-center">
        <div class="mr-1 flex-shrink-0 leading-0">
          <i
            v-if="props.message.role === 'user'"
            class="i-fluent-person-28-filled text-xs text-neutral-4"
          />
          <i
            v-else
            class="i-fluent-bot-48-filled text-xs text-neutral-4"
            :class="{ 'animate-pulse': props.loading && props.message.role === 'assistant' }"
          />
        </div>
        <div class="text-xs text-neutral-4 font-medium">
          <span v-if="props.message.role === 'user'">用户</span>
          <span
            v-else
            :class="{ 'animate-pulse': props.loading && props.message.role === 'assistant' }"
          >AI助手</span>
        </div>
      </div>
      <div class="w-full">
        <StreamContent
          v-if="props.message.role === 'assistant'"
          :content="props.message.content"
          :reasoning="props.message.reasoning"
          :loading="loading"
        />
        <UserChatMessage
          v-else
          :content="message.content"
        />
      </div>
    </div>
    <!-- 桌面端保持原有的左右结构 -->
    <div
      class="hidden md:flex md:gap-4"
    >
      <div class="sticky top-4 z-10 h-8 w-8 flex-shrink-0">
        <i
          v-if="props.message.role === 'user'"
          class="i-fluent-person-28-filled h-full w-full"
        />
        <i
          v-else
          class="i-fluent-bot-48-filled h-full w-full"
          :class="{ 'animate-pulse': loading && message.role === 'assistant' }"
        />
      </div>

      <div class="flex-grow overflow-hidden">
        <StreamContent
          v-if="message.role === 'assistant'"
          :content="message.content"
          :reasoning="message.reasoning"
          :loading="loading"
        />
        <UserChatMessage
          v-else
          :content="message.content"
        />
      </div>
    </div>
  </div>
</template>
