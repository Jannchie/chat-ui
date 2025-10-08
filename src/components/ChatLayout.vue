<script setup lang="ts">
import type { ChatData, ImageFile } from '../composables/chat-types'
import type { ProviderOptions, ReasoningEffort } from '../types/ai'
import type { ChatMessage, ImageContent, MessageContent, TextContent } from '../types/message'
import { Select } from '@roku-ui/vue'
import { streamText } from 'ai'
import { toRaw } from 'vue'
import { useRequestCache } from '../composables/useRequestCache'
import { useScrollToBottom } from '../composables/useScrollToBottom'
import { useSpeechToText } from '../composables/useSpeechToText'
import { getProviderFromPlatform } from '../lib/ai-providers'
import { createStreamCompletion } from '../lib/ai-stream-handler'
import {
  addAssistantMessageVersion,
  chatMessagesToModelMessages,
  createChatMessage,
  ensureAssistantMessageStructure,
  mergeChatMessageMetadata,
  normalizeChatMessages,
  setAssistantMessageActiveVersion,
  updateChatMessageContent,
  updateChatMessageReasoning,
} from '../lib/message-converter'
import { apiKey, model, openaiReasoningEffort, platform, serviceUrl, useCurrentChat } from '../shared'
import { generateId, isMobile, setChat } from '../utils'

const router = useRouter()

const lastUsage = ref<{
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
} | null>(null)

const conversation = shallowRef<ChatMessage[]>([])
const currentChat = useCurrentChat()

const lastAssistantMessageId = computed<string | null>(() => {
  const reversed = [...conversation.value].reverse()
  const lastAssistant = reversed.find(message => message.role === 'assistant')
  return lastAssistant ? lastAssistant.id : null
})

interface ReasoningEffortOption {
  value: ReasoningEffort
  label: string
}

const reasoningEffortOptions: ReasoningEffortOption[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'medium' },
  { value: 'high', label: 'High' },
]
const supportedEffortValues = new Set<ReasoningEffort>(
  reasoningEffortOptions.map(option => option.value),
)
const defaultReasoningEffortOption = reasoningEffortOptions.find(option => option.value === 'medium')
  ?? reasoningEffortOptions[0]

watchEffect(() => {
  if (!supportedEffortValues.has(openaiReasoningEffort.value)) {
    openaiReasoningEffort.value = 'medium'
  }
})

const showReasoningEffortSelector = computed(() => {
  return platform.value === 'openai'
    && typeof model.value === 'string'
    && model.value.includes('gpt-5')
})

const selectedReasoningEffort = computed<ReasoningEffortOption | undefined>({
  get() {
    return reasoningEffortOptions.find(option => option.value === openaiReasoningEffort.value)
      ?? defaultReasoningEffortOption
  },
  set(option) {
    const target = option ?? defaultReasoningEffortOption
    if (target && supportedEffortValues.has(target.value)) {
      openaiReasoningEffort.value = target.value
    }
  },
})

const reasoningProviderOptions = computed<ProviderOptions | undefined>(() => {
  if (!showReasoningEffortSelector.value) {
    return
  }
  return {
    openai: {
      reasoningEffort: openaiReasoningEffort.value,
    },
  } as ProviderOptions
})

watch([currentChat], () => {
  if (currentChat.value) {
    lastUsage.value = null
  }
})

watchEffect(() => {
  const chat = currentChat.value
  if (!chat) {
    conversation.value = []
    return
  }

  const needsNormalization = chat.conversation.some((message) => {
    if (message.role !== 'assistant') {
      return false
    }
    return !Array.isArray(message.versions)
      || message.versions.length === 0
      || message.activeVersionIndex === undefined
  })

  if (needsNormalization) {
    const normalized = normalizeChatMessages(chat.conversation)
    conversation.value = normalized
    setChat({
      ...toRaw(chat),
      conversation: normalized,
    })
    return
  }

  conversation.value = [...chat.conversation]
})

const { cacheSuccessfulRequest } = useRequestCache()

async function generateSummary(text: string, lockedModel?: string) {
  const modelToUse = lockedModel || model.value

  if (!modelToUse || !apiKey.value || !platform.value) {
    return null
  }

  try {
    const provider = getProviderFromPlatform(platform.value, apiKey.value, serviceUrl.value)
    const languageModel = provider.getModel(modelToUse)

    const result = await streamText({
      model: languageModel,
      messages: [
        {
          role: 'system',
          content: 'Please summarize the user\'s text and return the title of the text without adding any additional information. The title MUST in less than 4 words. Use the text language to summarize the text. Do not add any punctuation. Add "📝" emoji prefix to the summary.',
        },
        {
          role: 'user',
          content: `Summarize the following text in less than 4 words: ${text}`,
        },
      ],
      providerOptions: reasoningProviderOptions.value,
    })

    let content = ''
    for await (const textPart of result.textStream) {
      content += textPart
    }

    // Cache successful summary request
    cacheSuccessfulRequest({
      preset: platform.value || 'openai',
      serviceUrl: serviceUrl.value!,
      model: modelToUse,
      apiKey: apiKey.value,
    })

    return content
  }
  catch (error) {
    console.error('Failed to generate summary:', error)
    return null
  }
}

const groupedConversation = computed(() => {
  // 处理 conversation，每次轮到 ai 说话后，添加新的组，否则添加到上一组
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
const enableAutoScroll = ref(false)
function easeInOutQuad(time: number, start: number, change: number, duration: number) {
  time /= duration / 2
  if (time < 1) {
    return change / 2 * time * time + start
  }
  time--
  return -change / 2 * (time * (time - 2) - 1) + start
}
function scrollToBottomSmoothly(element: { scrollTop: number, scrollHeight: number, clientHeight: number }, duration: number) {
  const start = element.scrollTop
  const end = element.scrollHeight - element.clientHeight
  const distance = end - start
  const startTime = performance.now()

  function scroll() {
    const currentTime = performance.now()
    const timeElapsed = currentTime - startTime
    element.scrollTop = easeInOutQuad(timeElapsed, start, distance, duration)
    if (timeElapsed < duration) {
      requestAnimationFrame(scroll)
    }
    else {
      element.scrollTop = end
      enableAutoScroll.value = true
    }
  }

  scroll()
}

const scrollArea = ref<HTMLElement | null>(null)
const input = ref('')
const inputHistory = useManualRefHistory(input)
const streaming = ref(false)
const thinking = ref(false)
const uploadedImages = ref<ImageFile[]>([])
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const rows = ref(1)
watch([input, textareaRef], () => {
  nextTick(() => {
    if (textareaRef.value) {
      const targetRows = getNumberOfLines(textareaRef.value)
      rows.value = targetRows
    }
  })
}, { immediate: true })
function getNumberOfLines(textarea: HTMLTextAreaElement) {
  // 收缩，获取行数，然后展开
  textarea.style.height = '0px'
  const style = globalThis.getComputedStyle(textarea)
  const lineHeight = Number.parseInt(style.lineHeight)
  const padding = Number.parseInt(style.paddingTop) + Number.parseInt(style.paddingBottom)
  const textareaHeight = textarea.scrollHeight - padding
  const numberOfLines = Math.ceil(textareaHeight / lineHeight)
  textarea.style.height = ''
  return numberOfLines
}
watch(currentChat, () => {
  textareaRef.value?.focus()
})

// Speech-to-text (OpenAI Whisper) support
const {
  isSupported: sttSupported,
  isRecording,
  transcribing: sttTranscribing,
  audioBlob,
  error: sttError,
  startRecording,
  stopRecording,
  transcribeWithWhisper,
  reset: resetStt,
} = useSpeechToText()

async function onMicClick() {
  // Only enable for OpenAI preset as requested
  if (platform.value !== 'openai') {
    console.warn('Speech-to-text is currently enabled for OpenAI preset only.')
    return
  }
  if (!sttSupported.value) {
    console.error('Browser does not support MediaRecorder / microphone.')
    return
  }
  // Phase 1: start -> stop
  if (!isRecording.value && !audioBlob.value) {
    await startRecording()
    return
  }
  if (isRecording.value) {
    stopRecording()
  }
}

// Auto-transcribe after recording stops
watch([audioBlob, isRecording], async ([blob, recording]) => {
  if (
    platform.value === 'openai'
    && blob
    && !recording
    && !sttTranscribing.value
  ) {
    const text = await transcribeWithWhisper({
      apiKey: apiKey.value!,
      serviceUrl: serviceUrl.value || 'https://api.openai.com/v1',
      model: 'whisper-1',
    })
    if (text) {
      input.value = input.value ? `${input.value.trim()}\n${text}` : text
      nextTick(() => textareaRef.value?.focus())
    }
    if (sttError.value) {
      console.error('Transcription error:', sttError.value)
    }
    // Reset state so the mic is ready for the next recording
    resetStt()
  }
})
const laststartedAtMS = ref(0)
const lastEndedAtMS = ref(0)

interface StreamAssistantParams {
  chat: ChatData | null
  assistantMessage: ChatMessage
  currentModel: string
}

function updateChatConversation(chatData: ChatData | null, newConversation: ChatMessage[]): ChatData | null {
  if (!chatData) {
    return null
  }
  const normalizedConversation = normalizeChatMessages(newConversation)
  const rawChat = toRaw(chatData)
  const updatedChat: ChatData = {
    ...rawChat,
    conversation: normalizedConversation,
  }
  conversation.value = normalizedConversation
  setChat(updatedChat)
  return updatedChat
}

async function streamAssistantResponse({
  chat,
  assistantMessage,
  currentModel,
}: StreamAssistantParams): Promise<void> {
  streaming.value = true
  thinking.value = false
  lastUsage.value = null
  laststartedAtMS.value = 0
  lastEndedAtMS.value = 0

  const thinkingTimeout = globalThis.setTimeout(() => {
    if (streaming.value && !laststartedAtMS.value) {
      thinking.value = true
    }
  }, 500)

  const assistantIndex = conversation.value.findIndex(message => message.id === assistantMessage.id)
  const resolvedAssistantIndex = assistantIndex === -1
    ? [...conversation.value].map(message => message.id).lastIndexOf(assistantMessage.id)
    : assistantIndex

  function commitAssistantUpdate(updater: (message: ChatMessage) => ChatMessage) {
    if (resolvedAssistantIndex === -1) {
      return
    }
    const currentMessage = conversation.value[resolvedAssistantIndex]
    const updated = ensureAssistantMessageStructure(updater(ensureAssistantMessageStructure(currentMessage)))
    conversation.value[resolvedAssistantIndex] = updated
    conversation.value = [...conversation.value]
  }

  function applyStreamMessage(streamMessage: ChatMessage) {
    commitAssistantUpdate((baseMessage) => {
      let next = updateChatMessageContent(baseMessage, streamMessage.content)
      next = updateChatMessageReasoning(next, streamMessage.reasoning)
      if (streamMessage.metadata) {
        next = mergeChatMessageMetadata(next, streamMessage.metadata)
      }
      return next
    })
  }

  try {
    const provider = getProviderFromPlatform(platform.value, apiKey.value, serviceUrl.value)
    const languageModel = provider.getModel(currentModel)

    const messages = chatMessagesToModelMessages(
      conversation.value.slice(0, -1),
    )

    const result = await createStreamCompletion({
      model: languageModel,
      messages,
      preset: platform.value,
      providerOptions: reasoningProviderOptions.value,
      onUpdate: (updatedMessage: ChatMessage) => {
        if (laststartedAtMS.value === 0) {
          laststartedAtMS.value = Date.now()
        }

        if (thinking.value) {
          thinking.value = false
        }

        applyStreamMessage(updatedMessage)
      },
      onFinish: (finalMessage: ChatMessage, usage?: any) => {
        lastEndedAtMS.value = Date.now()
        thinking.value = false

        if (usage) {
          lastUsage.value = {
            prompt_tokens: usage.inputTokens,
            completion_tokens: usage.outputTokens,
            total_tokens: usage.totalTokens,
          }

          if (chat) {
            chat.token.inTokens += usage.inputTokens
            chat.token.outTokens += usage.outputTokens
          }
        }

        applyStreamMessage(finalMessage)

        cacheSuccessfulRequest({
          preset: platform.value || 'openai',
          serviceUrl: serviceUrl.value!,
          model: currentModel,
          apiKey: apiKey.value,
        })
      },
      onError: (error: Error) => {
        console.error('AI request error:', error)
        thinking.value = false
        const lastIndex = conversation.value.length - 1
        if (lastIndex >= 0) {
          const errorMessage = createChatMessage('error', error.message, {
            sentAt: assistantMessage.metadata?.sentAt || Date.now(),
            receivedAt: Date.now(),
          })
          conversation.value = [
            ...conversation.value.slice(0, lastIndex + 1),
            errorMessage,
          ]
        }
      },
    })

    if (result.error) {
      console.error('Stream completion failed:', result.error)
      conversation.value = [...conversation.value, result.message]
    }
  }
  catch (error: unknown) {
    console.error('Stream completion failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to get response from AI'
    const errorMessage = createChatMessage('error', message, {
      sentAt: assistantMessage.metadata?.sentAt || Date.now(),
      receivedAt: Date.now(),
    })
    conversation.value = [...conversation.value, errorMessage]
  }
  finally {
    globalThis.clearTimeout(thinkingTimeout)
    streaming.value = false
    thinking.value = false

    const lastAssistantIndex = [...conversation.value].map(message => message.role).lastIndexOf('assistant')
    if (lastAssistantIndex !== -1) {
      const lastAssistant = conversation.value[lastAssistantIndex]
      if (lastAssistant.metadata && !lastAssistant.metadata.receivedAt) {
        lastAssistant.metadata.receivedAt = Date.now()
        conversation.value = [...conversation.value]
      }
    }

    if (chat) {
      const updatedChat = updateChatConversation(chat, conversation.value) ?? chat
      if (!updatedChat.title) {
        const aiMessage = conversation.value
          .filter(message => message.role === 'assistant')
          .map(message => message.content)
          .join('\n')
        const summary = await generateSummary(aiMessage, currentModel)
        setChat({
          ...updatedChat,
          title: summary,
        })
      }
    }
  }
}
async function onSubmit() {
  if ((input.value.trim() === '' && uploadedImages.value.length === 0) || streaming.value) {
    return
  }

  // Lock the current model to prevent accidental switching during message sending
  const currentModel = model.value
  if (!currentModel) {
    // Show error if no model is selected
    console.error('Please select a model first')
    return
  }

  streaming.value = true
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

  // Create message content based on whether images are uploaded
  let messageContent: MessageContent
  if (uploadedImages.value.length > 0) {
    const contentArray: Array<TextContent | ImageContent> = []

    if (input.value.trim()) {
      contentArray.push({
        type: 'text',
        text: input.value.trim(),
      })
    }

    for (const image of uploadedImages.value) {
      contentArray.push({
        type: 'image_url',
        image_url: {
          url: image.dataUrl,
        },
      })
    }

    messageContent = contentArray
  }
  else {
    messageContent = `${input.value.trim()}\n`
  }

  inputHistory.commit()
  input.value = ''
  uploadedImages.value = []

  const userMessage = createChatMessage('user', messageContent, {
    sentAt: Date.now(),
  })
  const assistantMessage = createChatMessage('assistant', '', {
    sentAt: Date.now(),
    model: currentModel,
  })

  conversation.value = [...conversation.value, userMessage, assistantMessage]
  chat = updateChatConversation(chat, conversation.value) ?? chat

  const normalizedAssistantIndex = [...conversation.value].map(message => message.role).lastIndexOf('assistant')
  const normalizedAssistantMessage = normalizedAssistantIndex === -1
    ? ensureAssistantMessageStructure(assistantMessage)
    : ensureAssistantMessageStructure(conversation.value[normalizedAssistantIndex])

  if (normalizedAssistantIndex !== -1) {
    conversation.value[normalizedAssistantIndex] = normalizedAssistantMessage
    conversation.value = [...conversation.value]
  }

  nextTick(() => {
    const el = scrollArea.value
    if (el) {
      scrollToBottomSmoothly(el, 1000)
    }
  })

  await streamAssistantResponse({
    chat,
    assistantMessage: normalizedAssistantMessage,
    currentModel,
  })
}

async function regenerateLastAssistantMessage(): Promise<void> {
  if (streaming.value) {
    return
  }

  const targetAssistantId = lastAssistantMessageId.value
  if (!targetAssistantId) {
    return
  }

  const assistantIndex = conversation.value.findIndex(message => message.id === targetAssistantId)
  if (assistantIndex === -1) {
    return
  }

  const currentModel = model.value
  if (!currentModel) {
    console.error('Please select a model first')
    return
  }

  let chat = currentChat.value
  if (!chat) {
    console.error('No active chat to regenerate')
    return
  }

  streaming.value = true

  const trimmedConversation = conversation.value.slice(0, assistantIndex + 1)
  if (trimmedConversation.length !== conversation.value.length) {
    conversation.value = trimmedConversation
    chat = updateChatConversation(chat, conversation.value) ?? chat
  }

  const baseMessage = ensureAssistantMessageStructure(conversation.value[assistantIndex])
  const assistantMessage = addAssistantMessageVersion(baseMessage, {
    content: '',
    metadata: {
      sentAt: Date.now(),
      model: currentModel,
      preset: platform.value,
    },
  })

  conversation.value[assistantIndex] = assistantMessage
  conversation.value = [...conversation.value]
  chat = updateChatConversation(chat, conversation.value) ?? chat

  nextTick(() => {
    const el = scrollArea.value
    if (el) {
      scrollToBottomSmoothly(el, 1000)
    }
  })

  await streamAssistantResponse({
    chat,
    assistantMessage,
    currentModel,
  })
}

async function editUserMessage({ messageId, content }: { messageId: string, content: string }): Promise<void> {
  if (streaming.value) {
    console.warn('Cannot edit messages while streaming.')
    return
  }

  const chat = currentChat.value
  if (!chat) {
    console.error('No active chat to edit.')
    return
  }

  const targetIndex = conversation.value.findIndex(message => message.id === messageId)
  if (targetIndex === -1) {
    return
  }

  const targetMessage = conversation.value[targetIndex]
  if (targetMessage.role !== 'user' || typeof targetMessage.content !== 'string') {
    return
  }

  const sanitized = content.trim()
  if (!sanitized) {
    return
  }

  const currentModel = model.value
  if (!currentModel) {
    console.error('Please select a model first')
    return
  }

  const updatedContent = `${sanitized}\n`
  let updatedMessage = updateChatMessageContent(targetMessage, updatedContent)
  updatedMessage = mergeChatMessageMetadata(updatedMessage, {
    sentAt: Date.now(),
    edited: true,
  })

  const trimmedConversation = [
    ...conversation.value.slice(0, targetIndex),
    updatedMessage,
  ]

  conversation.value = trimmedConversation

  let activeChat = updateChatConversation(chat, conversation.value) ?? chat

  streaming.value = true

  const assistantMessage = createChatMessage('assistant', '', {
    sentAt: Date.now(),
    model: currentModel,
  })

  conversation.value = [...conversation.value, assistantMessage]
  activeChat = updateChatConversation(activeChat, conversation.value) ?? activeChat

  nextTick(() => {
    const el = scrollArea.value
    if (el) {
      scrollToBottomSmoothly(el, 1000)
    }
  })

  await streamAssistantResponse({
    chat: activeChat,
    assistantMessage,
    currentModel,
  })
}

function changeAssistantMessageVersion({ messageId, index }: { messageId: string, index: number }): void {
  const targetIndex = conversation.value.findIndex(message => message.id === messageId)
  if (targetIndex === -1) {
    return
  }

  const updatedMessage = setAssistantMessageActiveVersion(conversation.value[targetIndex], index)
  conversation.value[targetIndex] = updatedMessage
  conversation.value = [...conversation.value]

  const chat = currentChat.value
  if (chat) {
    updateChatConversation(chat, conversation.value)
  }

  const metadata = updatedMessage.metadata
  if (metadata?.usage) {
    lastUsage.value = {
      prompt_tokens: metadata.usage.input_tokens,
      completion_tokens: metadata.usage.output_tokens,
      total_tokens: metadata.usage.total_tokens,
    }
  }
  if (metadata?.sentAt) {
    laststartedAtMS.value = metadata.sentAt
  }
  if (metadata?.receivedAt) {
    lastEndedAtMS.value = metadata.receivedAt
  }
}
const lastTimeUsageMS = computed(() => {
  return lastEndedAtMS.value - laststartedAtMS.value
})
onMounted(() => {
  textareaRef.value?.focus()
})

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
        rows.value = targetRows
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
useScrollToBottom(scrollArea, 50, enableAutoScroll)
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
            <div class="op-50">
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
            :thinking="thinking && groupedConversation.length - 1 === i && c.role === 'assistant'"
            :show-regenerate="c.role === 'assistant' && !streaming && lastAssistantMessageId === c.id"
            :allow-user-edit="!streaming"
            @change-version="changeAssistantMessageVersion"
            @regenerate="regenerateLastAssistantMessage"
            @edit-message="editUserMessage"
          />
        </template>
      </div>
      <div class="input-section px-4 flex shrink-0 flex-col gap-1 min-h-120px items-center justify-end relative">
        <div
          class="text-sm rounded-md op50 flex flex-col h-20px shadow-sm items-center z-10"
        >
          <!-- 性能指标 -->
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
          <!-- 合并的输入/输出统计 -->
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
        <div class="leading-0 max-w-830px w-full relative z-10">
          <!-- Image preview area above input panel -->
          <div
            v-if="uploadedImages.length > 0"
            class="mb-3 pt-3 flex flex-wrap gap-3"
          >
            <div
              v-for="image in uploadedImages"
              :key="image.id"
              class="group relative"
            >
              <img
                :src="image.dataUrl"
                :alt="image.file.name"
                class="dark:border-neutral-6 border border-neutral-300 rounded-lg h-16 w-16 object-cover"
              >
              <button
                class="dark:hover:bg-neutral-7 rounded-full bg-neutral-300 opacity-0 flex h-6 w-6 transition-opacity items-center justify-center absolute dark:bg-neutral-800 hover:bg-neutral-400 group-hover:opacity-100 -right-2 -top-2"
                @click="uploadedImages = uploadedImages.filter((img: ImageFile) => img.id !== image.id)"
              >
                <i class="i-tabler-x text-neutral-3 h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Unified input panel -->
          <div
            class="rounded-xl bg-neutral-100 transition-all relative dark:bg-[#1e1e1f] focus-within:bg-neutral-200 hover:bg-neutral-200 dark:focus-within:bg-neutral-800 dark:hover:bg-neutral-800"
          >
            <!-- Textarea without border -->
            <textarea
              ref="textareaRef"
              v-model="input"
              type="text"
              style="resize: none; scrollbar-width: none; max-height: 300px; height: auto;"
              :rows="rows"
              class="text-lg text-neutral-800 px-4 py-4 outline-none border-none bg-transparent flex-grow-0 w-full dark:text-[#e3e3e3]"
              placeholder="Input your question here"
              @keydown.stop.up="async (e) => {
                if (!(input === '')) return
                const target = e.target as HTMLTextAreaElement
                if (target.selectionStart === 0) {
                  const currentIdx = inputHistory.history.value.map(d => d.snapshot).indexOf(input)
                  if (currentIdx === -1) {
                    input = inputHistory.history.value[0].snapshot
                  }
                  else {
                    input = inputHistory.history.value[(currentIdx + 1) % inputHistory.history.value.length].snapshot
                  }
                }
              }"
              @keypress.stop.prevent.enter="onEnter"
            />

            <!-- Bottom buttons (stacked below textarea) -->
            <div class="px-4 pb-3 flex items-center justify-between">
              <!-- Image upload button - bottom left -->
              <div>
                <ImageUpload v-model="uploadedImages" />
              </div>

              <!-- Prompt optimize and send buttons - bottom right -->
              <div class="flex gap-2 items-center">
                <div
                  v-if="showReasoningEffortSelector"
                  class="text-xs text-neutral-500 flex gap-2 items-center dark:text-neutral-400"
                >
                  <span>
                    Effort
                  </span>
                  <Select
                    v-model="selectedReasoningEffort"
                    :options="reasoningEffortOptions"
                    label-key="label"
                    color="surface"
                    rounded="sm"
                    size="sm"
                    none-text="Select effort"
                    class="effort-select w-24"
                  />
                </div>
                <!-- Speech-to-Text (OpenAI Whisper) button -->
                <button
                  v-if="platform === 'openai'"
                  :disabled="streaming || !sttSupported || sttTranscribing"
                  :title="
                    !sttSupported
                      ? 'Browser does not support microphone.'
                      : sttTranscribing
                        ? 'Transcribing audio...'
                        : isRecording
                          ? 'Click to stop recording'
                          : 'Click to start recording'
                  "
                  class="color-[#c4c7c5] rounded-lg flex h-8 w-8 transition-all items-center justify-center"
                  :class="{
                    'opacity-50 cursor-not-allowed': streaming || !sttSupported || sttTranscribing,
                    'hover:bg-neutral-700': !streaming && sttSupported && !sttTranscribing,
                    'bg-red-500/20': isRecording,
                  }"
                  @click="onMicClick"
                >
                  <i v-if="sttTranscribing" class="i-tabler-loader-2 h-4 w-4 animate-spin" />
                  <i v-else-if="isRecording" class="i-tabler-player-stop h-5 w-5" />
                  <i v-else class="i-tabler-microphone h-5 w-5" />
                </button>
                <!-- Prompt optimize button -->
                <PromptOptimizeButton
                  v-model="input"
                  :disabled="streaming"
                  size="md"
                  variant="ghost"
                  @optimized="(optimizedPrompt: string) => {
                    // Optional: Show a toast notification or animation
                    console.log('Prompt optimized:', optimizedPrompt)
                  }"
                />

                <!-- Send button -->
                <button
                  :disabled="streaming || (!input.trim() && uploadedImages.length === 0)"
                  :class="{
                    'opacity-50 cursor-not-allowed': streaming || (!input.trim() && uploadedImages.length === 0),
                    'hover:bg-neutral-700': !streaming && (input.trim() || uploadedImages.length > 0),
                  }"
                  class="color-[#c4c7c5] rounded-lg flex h-8 w-8 transition-all items-center justify-center"
                  @click="onSubmit"
                >
                  <i class="i-tabler-send h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div class="animate-fade-delay text-xs color-[#6d6d6d] pb-3 pt-1 flex gap-2 animate-delay-500 dark:color-[#c4c7c5]">
          <span>
            Jannchie's Web UI for Chat Services
          </span>
          <a
            class="underline"
            target="_blank"
            href="https://github.com/Jannchie/gemini-chat-ui"
          >Repository</a>
        </div>
      </div>
    </MainContainer>
  </BaseContainer>
</template>
