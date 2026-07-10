<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { messageContentToString } from '../utils/messageTransform'
import MessageMetadataBottom from './MessageMetadataBottom.vue'
import MessageMetadataTop from './MessageMetadataTop.vue'

const { message, loading, thinking, showRegenerate, allowUserEdit, allowDelete }
  = defineProps<{
    message: ChatMessage
    loading: boolean
    thinking?: boolean
    showRegenerate?: boolean
    allowUserEdit?: boolean
    allowDelete?: boolean
  }>()
const emit = defineEmits<{
  (event: 'regenerate', payload: { messageId: string }): void
  (event: 'changeVersion', payload: { messageId: string, index: number }): void
  (event: 'editMessage', payload: { messageId: string, content: string }): void
  (event: 'deleteMessage', payload: { messageId: string }): void
}>()

// For user messages, convert to string for UserChatMessage component
const contentAsString = computed(() =>
  messageContentToString(message.content),
)
const {
  copy,
  copied: showCopyTooltip,
  isSupported: clipboardSupported,
} = useClipboard({ copiedDuring: 2000 })

const versionCount = computed(() => {
  if (message.role !== 'assistant') {
    return 0
  }
  return message.versions?.length ?? 0
})

const activeVersionIndex = computed(() => {
  if (message.role !== 'assistant') {
    return 0
  }
  return message.activeVersionIndex ?? 0
})

const hasMultipleVersions = computed(() => {
  return versionCount.value > 1
})

const versionLabel = computed(() => {
  if (versionCount.value === 0) {
    return ''
  }
  return `${activeVersionIndex.value + 1}/${versionCount.value}`
})

async function copyMessageContent(): Promise<void> {
  if (!clipboardSupported.value) {
    return
  }

  const content = contentAsString.value
  if (!content) {
    return
  }

  try {
    await copy(content)
  }
  catch (error) {
    console.error(`Failed to copy content: ${error}`)
  }
}

function changeAssistantVersion(targetIndex: number) {
  if (message.role !== 'assistant' || versionCount.value === 0) {
    return
  }
  const clamped = Math.min(Math.max(targetIndex, 0), versionCount.value - 1)
  if (clamped === activeVersionIndex.value) {
    return
  }
  emit('changeVersion', {
    messageId: message.id,
    index: clamped,
  })
}

function viewPreviousVersion() {
  changeAssistantVersion(activeVersionIndex.value - 1)
}

function viewNextVersion() {
  changeAssistantVersion(activeVersionIndex.value + 1)
}

const hasOnlyTextContent = computed(() => {
  if (message.role !== 'user') {
    return false
  }
  const content = message.content
  if (typeof content === 'string') {
    return true
  }
  if (Array.isArray(content)) {
    return content.every(item => item.type === 'text')
  }
  return false
})

const allowEditing = computed(() => {
  const allowedByParent = allowUserEdit !== false
  return allowedByParent && hasOnlyTextContent.value
})

const isEditing = ref(false)

function startEditing(): void {
  if (!allowEditing.value) {
    return
  }
  isEditing.value = true
}

function onEditorConfirm(content: string): void {
  emit('editMessage', {
    messageId: message.id,
    content,
  })
  isEditing.value = false
}

watch(
  () => [message.id, allowUserEdit] as const,
  ([newId, newAllow], [oldId]) => {
    if (newId !== oldId || newAllow === false) {
      isEditing.value = false
    }
  },
)
</script>

<template>
  <div class="m-auto max-w-chat w-full px-3 py-3 md:px-4 md:py-4">
    <!-- 用户消息：右对齐气泡 -->
    <div
      v-if="message.role === 'user'"
      class="flex flex-col items-end gap-2"
    >
      <MessageMetadataTop :message="message" />
      <UserMessageEditor
        v-if="isEditing"
        :initial-content="contentAsString.trimEnd()"
        @confirm="onEditorConfirm"
        @cancel="isEditing = false"
      />
      <div v-else class="group max-w-[85%] flex items-start gap-1">
        <div
          class="mt-1.5 flex shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
        >
          <button
            v-if="allowDelete"
            type="button"
            class="h-8 w-8 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 hover:text-red-500 dark:hover:bg-neutral-800 dark:hover:text-red-400"
            aria-label="Delete message"
            title="Delete message"
            @click="emit('deleteMessage', { messageId: message.id })"
          >
            <i class="i-tabler-trash h-4 w-4" />
          </button>
          <button
            type="button"
            class="relative h-8 w-8 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
            :class="{ 'opacity-50 cursor-not-allowed': !clipboardSupported }"
            :disabled="!clipboardSupported"
            aria-label="Copy message"
            title="Copy message"
            @click="copyMessageContent"
          >
            <i class="i-tabler-copy h-4 w-4" />
            <span
              v-if="showCopyTooltip"
              class="pointer-events-none absolute top-full mt-1 whitespace-nowrap rounded bg-black/70 px-2 py-1 text-xs text-white dark:bg-white/70 dark:text-black"
            >
              Copied!
            </span>
          </button>
          <button
            v-if="allowEditing"
            type="button"
            class="h-8 w-8 flex items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label="Edit message"
            title="Edit message"
            @click="startEditing"
          >
            <i class="i-tabler-edit h-4 w-4" />
          </button>
        </div>
        <div
          class="min-w-0 flex items-start gap-1 rounded-2xl bg-neutral-200/70 px-4 py-3 dark:bg-elevated"
        >
          <UserChatMessage :content="message.content" />
        </div>
      </div>
    </div>

    <!-- 助手 / 错误消息：直接铺在页面底色上 -->
    <template v-else>
      <div class="mb-3">
        <MessageMetadataTop :message="message" />
      </div>

      <AssistantMessage
        v-if="message.role === 'assistant'"
        :content="message.content"
        :reasoning="message.reasoning"
        :loading="loading"
        :thinking="thinking"
        :model="message.metadata?.model"
        :reasoning-start-at="message.metadata?.reasoningStartAt"
        :reasoning-end-at="message.metadata?.reasoningEndAt"
      />
      <ErrorChatMessage
        v-else-if="message.role === 'error'"
        :content="contentAsString"
      />
    </template>

    <!-- 底部元数据 - 显示执行完毕后的性能指标 -->
    <div
      v-if="message.role !== 'user'"
      class="mt-3 min-h-6 flex items-center gap-2"
    >
      <Transition name="fade">
        <MessageMetadataBottom
          v-if="message.role === 'assistant' && !loading"
          :message="message"
        />
      </Transition>
      <div class="ml-auto flex items-center gap-1">
        <div
          v-if="hasMultipleVersions"
          class="flex items-center gap-1 text-xs text-neutral-500 dark:text-neutral-300"
        >
          <button
            type="button"
            class="h-6 w-6 flex items-center justify-center rounded-md transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
            :class="{
              'opacity-50 cursor-not-allowed': activeVersionIndex === 0,
            }"
            :disabled="activeVersionIndex === 0"
            aria-label="Previous version"
            title="Previous version"
            @click="viewPreviousVersion"
          >
            <i class="i-tabler-chevron-left h-4 w-4" />
          </button>
          <span class="px-1 text-center text-xs font-mono">{{
            versionLabel
          }}</span>
          <button
            type="button"
            class="h-6 w-6 flex items-center justify-center rounded-md transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
            :class="{
              'opacity-50 cursor-not-allowed':
                activeVersionIndex >= versionCount - 1,
            }"
            :disabled="activeVersionIndex >= versionCount - 1"
            aria-label="Next version"
            title="Next version"
            @click="viewNextVersion"
          >
            <i class="i-tabler-chevron-right h-4 w-4" />
          </button>
        </div>
        <button
          v-if="message.role === 'assistant'"
          type="button"
          class="relative h-8 w-8 flex items-center justify-center rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
          :class="{ 'opacity-50 cursor-not-allowed': !clipboardSupported }"
          :disabled="!clipboardSupported"
          aria-label="Copy response"
          title="Copy response"
          @click="copyMessageContent"
        >
          <i class="i-tabler-copy h-4 w-4" />
          <span
            v-if="showCopyTooltip"
            class="pointer-events-none absolute top-full mt-1 whitespace-nowrap rounded bg-black/70 px-2 py-1 text-xs text-white dark:bg-white/70 dark:text-black"
          >
            Copied!
          </span>
        </button>
        <button
          v-if="showRegenerate"
          type="button"
          class="h-8 w-8 flex items-center justify-center rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 dark:text-neutral-300 dark:hover:bg-neutral-800"
          aria-label="Regenerate response"
          title="Regenerate response (discards following messages)"
          @click="emit('regenerate', { messageId: message.id })"
        >
          <i class="i-tabler-refresh h-4 w-4" />
        </button>
        <button
          v-if="allowDelete && !loading"
          type="button"
          class="h-8 w-8 flex items-center justify-center rounded-md p-1.5 text-neutral-500 transition-colors hover:bg-neutral-200 dark:text-neutral-300 hover:text-red-500 dark:hover:bg-neutral-800 dark:hover:text-red-400"
          aria-label="Delete message"
          title="Delete message"
          @click="emit('deleteMessage', { messageId: message.id })"
        >
          <i class="i-tabler-trash h-4 w-4" />
        </button>
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
