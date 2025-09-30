<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { messageContentToString } from '../utils/messageTransform'
import MessageMetadataBottom from './MessageMetadataBottom.vue'
import MessageMetadataTop from './MessageMetadataTop.vue'

const props = defineProps<{
  message: ChatMessage
  loading: boolean
  thinking?: boolean
  showRegenerate?: boolean
}>()
const emit = defineEmits<{
  (event: 'regenerate'): void
}>()
const message = computed(() => props.message)

// 为底部 metadata 容器添加自动动画指令

// For user messages, convert to string for UserChatMessage component
const contentAsString = computed(() => messageContentToString(message.value.content))

// For assistant messages, use original content structure
const assistantContent = computed(() => message.value.content)
const showCopyTooltip = ref(false)
let copyTooltipTimeout: NodeJS.Timeout | undefined

const clipboardSupported = computed(() => {
  return typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
})

function clearCopyTooltipTimeout() {
  if (copyTooltipTimeout !== undefined) {
    globalThis.clearTimeout(copyTooltipTimeout)
    copyTooltipTimeout = undefined
  }
}

async function copyAssistantContent(): Promise<void> {
  if (props.message.role !== 'assistant' || !clipboardSupported.value) {
    return
  }

  const content = contentAsString.value
  if (!content) {
    return
  }

  try {
    await navigator.clipboard.writeText(content)
    showCopyTooltip.value = true
    clearCopyTooltipTimeout()
    copyTooltipTimeout = globalThis.setTimeout(() => {
      showCopyTooltip.value = false
      copyTooltipTimeout = undefined
    }, 2000)
  }
  catch (error) {
    console.error(`Failed to copy content: ${error}`)
  }
}

onBeforeUnmount(() => {
  clearCopyTooltipTimeout()
})
</script>

<template>
  <div
    class="m-auto px-3 py-4 flex-grow-1 w-full md:px-4 md:py-6 md:max-w-712px"
    :class="{
      'bg-neutral-100 dark:bg-neutral-800 rounded-t-xl': message.role === 'user',
      'bg-neutral-100 dark:bg-neutral-900 rounded-b-xl mb-2': message.role === 'assistant',
    }"
  >
    <!-- 移动端上下结构布局（图标+文字在上，内容在下） -->
    <div
      class="block md:hidden"
    >
      <div class="mb-3 flex items-center">
        <div class="leading-0 mr-1 flex-shrink-0">
          <i
            v-if="props.message.role === 'user'"
            class="text-neutral-4 i-fluent-person-28-filled text-xs"
          />
          <i
            v-else
            class="text-neutral-4 i-fluent-bot-48-filled text-xs"
            :class="{ 'animate-pulse': props.loading && props.message.role === 'assistant' }"
          />
        </div>
        <div class="text-neutral-4 text-xs font-medium">
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
          :thinking="props.thinking"
          :model="props.message.metadata?.model"
        />
        <UserChatMessage
          v-else
          :content="message.content"
        />
      </div>
      <!-- 移动端底部元数据 - 显示执行完毕后的性能指标 -->
      <div class="mt-3 flex gap-2 min-h-6 items-center">
        <Transition name="fade">
          <MessageMetadataBottom v-if="props.message.role === 'assistant' && !loading" :message="message" />
        </Transition>
        <div
          v-if="props.message.role === 'assistant'"
          class="ml-auto flex gap-1 items-center"
        >
          <button
            type="button"
            class="text-neutral-500 p-1.5 rounded-md flex h-8 w-8 transition-colors items-center justify-center relative dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            :class="{ 'opacity-50 cursor-not-allowed': !clipboardSupported }"
            :disabled="!clipboardSupported"
            aria-label="Copy response"
            title="Copy response"
            @click="copyAssistantContent"
          >
            <i class="i-tabler-copy h-4 w-4" />
            <span
              v-if="showCopyTooltip"
              class="text-xs text-white px-2 py-1 rounded bg-black/70 pointer-events-none whitespace-nowrap translate-y-8 absolute dark:text-black dark:bg-white/70"
            >
              Copied!
            </span>
          </button>
          <button
            v-if="props.showRegenerate"
            type="button"
            class="text-neutral-500 p-1.5 rounded-md flex h-8 w-8 transition-colors items-center justify-center dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
            aria-label="Regenerate response"
            title="Regenerate response"
            @click="emit('regenerate')"
          >
            <i class="i-tabler-refresh h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
    <!-- 桌面端保持原有的左右结构 -->
    <div
      class="hidden md:flex md:gap-4"
    >
      <div class="flex-shrink-0 h-8 w-8 top-4 sticky z-10">
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
          :thinking="props.thinking"
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
        <div class="mt-3 flex gap-2 min-h-6 items-center">
          <Transition name="fade">
            <MessageMetadataBottom v-if="message.role === 'assistant' && !loading" :message="message" />
          </Transition>
          <div
            v-if="message.role === 'assistant'"
            class="ml-auto flex gap-1 items-center"
          >
            <button
              type="button"
              class="text-neutral-500 p-1.5 rounded-md flex h-8 w-8 transition-colors items-center justify-center relative dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              :class="{ 'opacity-50 cursor-not-allowed': !clipboardSupported }"
              :disabled="!clipboardSupported"
              aria-label="Copy response"
              title="Copy response"
              @click="copyAssistantContent"
            >
              <i class="i-tabler-copy h-4 w-4" />
              <span
                v-if="showCopyTooltip"
                class="text-xs text-white mt-1 px-2 py-1 rounded bg-black/70 pointer-events-none whitespace-nowrap top-full absolute dark:text-black dark:bg-white/70"
              >
                Copied!
              </span>
            </button>
            <button
              v-if="props.showRegenerate"
              type="button"
              class="text-neutral-500 p-1.5 rounded-md flex h-8 w-8 transition-colors items-center justify-center dark:text-neutral-300 hover:bg-neutral-200 dark:hover:bg-neutral-800"
              aria-label="Regenerate response"
              title="Regenerate response"
              @click="emit('regenerate')"
            >
              <i class="i-tabler-refresh h-4 w-4" />
            </button>
          </div>
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
