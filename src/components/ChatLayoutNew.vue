<script setup lang="ts">
import type { ImageFile } from '../composables/chat-types'
import type { ChatMessage } from '../types/message'
import ChatInput from './ChatInput.vue'
import { useStreamChat } from '../composables/useStreamChat'
import { useChatSummary } from '../composables/useChatSummary'
import { useScrollControl } from '../composables/useScrollControl'
import { useCurrentChat } from '../shared'
import { generateId, isMobile, setChat } from '../utils'

const router = useRouter()

// Chat state
const conversation = shallowRef<ChatMessage[]>([])
const currentChat = useCurrentChat()

// Input state
const input = ref('')
const inputHistory = useManualRefHistory(input)
const uploadedImages = ref<ImageFile[]>([])

// Scroll control
const scrollArea = ref<HTMLElement | null>(null)
const { enableAutoScroll, scrollToBottom } = useScrollControl()

// Stream chat
const { streaming, lastUsage, lastTimeUsageMS, sendMessage } = useStreamChat()

// Chat summary
const { generateSummary } = useChatSummary()

// Watch for chat changes
watch([currentChat], () => {
  if (currentChat.value) {
    // Reset usage when switching chats
  }
})

watchEffect(() => {
  conversation.value = currentChat.value ? currentChat.value.conversation : []
})

// Grouped conversation for display
const groupedConversation = computed(() => {
  const result: ChatMessage[][] = []
  let group: ChatMessage[] = []
  for (const c of conversation.value) {
    if (c.role === 'system') {
      continue
    }
    if (c.role === 'assistant') {
      group.push(c)
      result.push(group)
      group = []
    }
    else {
      group.push(c)
    }
  }
  if (group.length > 0) {
    result.push(group)
  }
  return result
})

// Handle message submission
async function onSubmit() {
  if ((input.value.trim() === '' && uploadedImages.value.length === 0) || streaming.value) {
    return
  }

  let chat = currentChat.value
  if (!chat) {
    // Create a new chat history entry at the start
    const id = generateId()
    chat = {
      id,
      title: null,
      conversation: conversation.value,
      token: {
        inTokens: 0,
        outTokens: 0,
      },
    }
    setChat(chat)
    router.push({
      name: 'chat',
      params: {
        id,
      },
    })
  }

  const inputText = input.value
  const images = [...uploadedImages.value]
  
  // Clear input immediately
  inputHistory.value.commit()
  input.value = ''
  uploadedImages.value = []

  try {
    const result = await sendMessage(
      conversation.value,
      inputText,
      images,
      {
        onUpdate: (updatedMessage: ChatMessage) => {
          // Update the last message in conversation
          const lastIndex = conversation.value.length - 1
          if (lastIndex >= 0) {
            conversation.value[lastIndex] = updatedMessage
            conversation.value = [...conversation.value]
          }
        },
        onFinish: (finalMessage: ChatMessage, usage?: any) => {
          if (usage && chat) {
            chat.token.inTokens += usage.inputTokens
            chat.token.outTokens += usage.outputTokens
          }

          // Update conversation with final message
          const lastIndex = conversation.value.length - 1
          if (lastIndex >= 0) {
            conversation.value[lastIndex] = finalMessage
            conversation.value = [...conversation.value]
          }

          // Update chat with final conversation
          if (chat) {
            chat.conversation = conversation.value
            setChat(toRaw(chat))
            
            // Generate title if needed
            if (!chat.title) {
              const aiMessage = conversation.value
                .filter(d => d.role === 'assistant')
                .map(d => d.content)
                .join('\n')
              generateSummary(aiMessage).then((summary) => {
                if (summary && chat) {
                  setChat({
                    ...chat,
                    title: summary,
                  })
                }
              })
            }
          }
        },
        onError: (error: Error) => {
          // Handle error
          console.error('Chat error:', error)
        },
      }
    )

    // Update conversation with new messages
    conversation.value = [...conversation.value, ...result.message ? [result.message] : []]
    if (chat) {
      chat.conversation = conversation.value
      setChat(toRaw(chat))
    }

    // Scroll to bottom after sending
    nextTick(() => {
      scrollToBottom(scrollArea.value, 1000)
    })
  }
  catch (error) {
    console.error('Failed to send message:', error)
  }
}

// Handle input events
async function onEnter(e: KeyboardEvent) {
  if (e.isComposing) {
    return
  }
  if (streaming.value) {
    return
  }
  if (!input.value.trim() && uploadedImages.value.length === 0) {
    return
  }

  const target = e.target as HTMLTextAreaElement
  if (!isMobile.value && e.shiftKey && target) {
    const selectStart = target.selectionStart
    input.value = `${input.value.slice(0, selectStart)}\n${input.value.slice(target.selectionEnd)}`
    if (e.target) {
      nextTick(() => {
        const totalRows = target.value.split('\n').length
        const targetRows = Math.min(totalRows, 3)
        target.selectionStart = selectStart + 1
        target.selectionEnd = selectStart + 1
        const lineHeight = Number.parseInt(globalThis.getComputedStyle(target).lineHeight)
        target.scroll({
          top: lineHeight * totalRows,
        })
      })
    }
    return
  }
  if (isMobile.value) {
    input.value += '\n'
    const target = e.target as HTMLTextAreaElement
    if (e.target) {
      nextTick(() => {
        const rows = target.value.split('\n').length
        target.rows = rows
        target.scrollTop = target.scrollHeight
      })
    }
    return
  }
  onSubmit()
}

// Setup auto-scroll
const { setupAutoScroll } = useScrollControl()
setupAutoScroll(scrollArea, 50)

watchEffect(() => {
  if (streaming.value) {
    enableAutoScroll.value = false
  }
})
</script>

<template>
  <BaseContainer>
    <ChatAside />
    <MainContainer>
      <ChatHeader />
      <div
        v-if="conversation.length <= 1"
        class="text-3.5rem leading-4rem font-medium m-auto px-4 h-full max-w-830px w-full overflow-x-hidden overflow-y-auto"
      >
        <div class="md:mb-12 md:mt-8">
          <div class="gradient-text text-3xl lg:text-5xl md:text-4xl">
            Hi there!
          </div>
          <div class="animate-fade-delay text-2xl lg:text-4xl md:text-3xl">
            <div class="op-25">
              What can I help you today?
            </div>
          </div>
        </div>
        <div class="mb-10 mt-20 flex gap-4">
          <div class="animate-fade-delay">
            <button
              class="dark:hover:bg-neutral-7 leading-0 p-4 rounded-xl bg-neutral-200 flex flex-row w-full shadow-sm transition-colors justify-between md:p-5 dark:bg-neutral-800 hover:bg-neutral-300 md:flex-col md:h-200px md:w-200px dark:hover:bg-neutral-700"
              @click="router.push({ name: 'translate' })"
            >
              <div class="flex gap-2 items-center">
                <div class="rounded-lg bg-blue-500/20 flex h-8 w-8 items-center justify-center">
                  <i class="i-tabler-language text-blue-400 h-5 w-5" />
                </div>
                <div class="text-base font-medium">
                  Translate
                </div>
              </div>
              <div class="text-neutral-5 text-xs ml-auto hidden items-center md:ml-0 md:mt-4 md:flex">
                Easily translate between multiple languages
              </div>
            </button>
          </div>
        </div>
      </div>
      <div
        v-else
        ref="scrollArea"
        class="overflow-x-hidden overflow-y-auto last-children:min-h-[calc(100dvh-152px-72px)]"
      >
        <template
          v-for="g, i in groupedConversation"
          :key="i"
        >
          <ChatMessage
            v-for="c, j in g"
            :key="j"
            :message="c"
            :loading="streaming && groupedConversation.length - 1 === i"
          />
        </template>
      </div>

      <!-- Stats display -->
      <div class="text-sm rounded-md op50 flex flex-col h-20px shadow-sm items-center z-10 px-4">
        <!-- Performance metrics -->
        <div
          v-if="lastUsage && lastTimeUsageMS > 0"
          class="flex gap-1 items-center"
        >
          <div>
            <span class="font-medium mr-1">Current:</span>
            <span>{{ lastUsage.prompt_tokens }} / {{ lastUsage.completion_tokens }} Token</span>
          </div>
          ·
          <div>
            <span class="font-medium mr-1">Speed:</span>
            <span>{{ (lastUsage.completion_tokens / lastTimeUsageMS * 1000).toFixed(2) }} Token/s</span>
          </div>
        </div>
        <!-- Combined input/output statistics -->
        <div
          v-if="currentChat && currentChat.token.inTokens > 0 && currentChat.token.outTokens > 0"
          class="mr-6 flex items-center"
        >
          <span class="font-medium mr-1">Total Input/Output:</span>
          <span>
            {{ currentChat.token.inTokens }} / {{ currentChat.token.outTokens }} Token
          </span>
        </div>
      </div>

      <!-- Chat Input -->
      <ChatInput
        v-model="input"
        v-model:uploaded-images="uploadedImages"
        :streaming="streaming"
        @submit="onSubmit"
        @enter="onEnter"
      />

      <div class="animate-fade-delay text-xs color-[#6d6d6d] pb-3 pt-1 flex gap-2 animate-delay-500 dark:color-[#c4c7c5] px-4">
        <span>
          Jannchie's Web UI for Chat Services
        </span>
        <a
          class="underline"
          target="_blank"
          href="https://github.com/Jannchie/gemini-chat-ui"
        >Repository</a>
      </div>
    </MainContainer>
  </BaseContainer>
</template>