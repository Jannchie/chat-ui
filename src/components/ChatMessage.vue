<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { messageContentToString } from '../utils/messageTransform'
import MessageMetadataBottom from './MessageMetadataBottom.vue'
import MessageMetadataTop from './MessageMetadataTop.vue'

const props = defineProps<{
  message: ChatMessage
  loading: boolean
}>()
const message = computed(() => props.message)

// 为底部 metadata 容器添加自动动画指令

// For user messages, convert to string for UserChatMessage component
const contentAsString = computed(() => messageContentToString(message.value.content))

// For assistant messages, use original content structure
const assistantContent = computed(() => message.value.content)
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
      <div class="mb-3 flex items-center">
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
          <span v-if="props.message.role === 'user'">User</span>
          <span
            v-else
            :class="{ 'animate-pulse': props.loading && props.message.role === 'assistant' }"
          >AI Assistant</span>
        </div>
      </div>
      <!-- 移动端元数据 - 移到消息内容上方 -->
      <div class="mb-3">
        <MessageMetadataTop :message="message" />
      </div>
      <div class="w-full">
        <AssistantMessage
          v-if="props.message.role === 'assistant'"
          :content="assistantContent"
          :reasoning="props.message.reasoning"
          :loading="loading"
          :model="props.message.metadata?.model"
        />
        <UserChatMessage
          v-else
          :content="message.content"
        />
      </div>
      <!-- 移动端底部元数据 - 显示执行完毕后的性能指标 -->
      <div class="mt-3 min-h-6">
        <Transition name="fade">
          <MessageMetadataBottom v-if="props.message.role === 'assistant' && !loading" :message="message" />
        </Transition>
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
          v-else-if="props.message.role === 'assistant'"
          class="i-fluent-bot-48-filled h-full w-full"
          :class="{ 'animate-pulse': loading && message.role === 'assistant' }"
        />
        <i
          v-else
          class="i-fluent-error-circle-24-filled h-full w-full"
        />
      </div>

      <div class="flex-grow overflow-hidden">
        <!-- 桌面端元数据 - 移到消息内容上方 -->
        <div class="mb-3">
          <MessageMetadataTop :message="message" />
        </div>

        <AssistantMessage
          v-if="message.role === 'assistant'"
          :content="assistantContent"
          :reasoning="message.reasoning"
          :loading="loading"
          :model="message.metadata?.model"
        />
        <UserChatMessage
          v-else-if="message.role === 'user'"
          :content="message.content"
        />
        <ErrorChatMessage
          v-else-if="message.role === 'error'"
          :content="contentAsString"
        />

        <!-- 桌面端底部元数据 - 显示执行完毕后的性能指标 -->
        <div class="mt-3 min-h-6">
          <Transition name="fade">
            <MessageMetadataBottom v-if="message.role === 'assistant' && !loading" :message="message" />
          </Transition>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
}
</style>
