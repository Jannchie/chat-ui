<script setup lang="ts">
import type { ChatData, ImageFile } from '../composables/chat-types'
import type { ReasoningEffort } from '../types/ai'
import type {
  ChatMessage,
  ImageContent,
  MessageContent,
  TextContent,
} from '../types/message'
import { streamText } from 'ai'
import { Virtualizer } from 'virtua/vue'
import { toRaw } from 'vue'
import { useOpenRouterModels } from '../composables/useOpenRouterModels'
import { useRequestCache } from '../composables/useRequestCache'
import { useScrollToBottom } from '../composables/useScrollToBottom'
import { useSpeechToText } from '../composables/useSpeechToText'
import { getProviderFromPlatform } from '../lib/ai-providers'
import { AIStreamHandler } from '../lib/ai-stream-handler'
import {
  addAssistantMessageVersion,
  chatMessagesToModelMessages,
  createChatMessage,
  ensureAssistantMessageStructure,
  isChatMessage,
  mergeChatMessageMetadata,
  normalizeChatMessages,
  setAssistantMessageActiveVersion,
  updateChatMessageContent,
  updateChatMessageReasoning,
} from '../lib/message-converter'
import {
  buildReasoningProviderOptions,
  resolveReasoningCapability,
  resolveReasoningEffortPreference,
} from '../lib/reasoning'
import {
  apiKey,
  chatHistoryLoaded,
  model,
  openaiReasoningEffort,
  platform,
  requestTimeout,
  serviceUrl,
  useCurrentChat,
} from '../shared'
import { generateId, isMobile, setChat } from '../utils'

const router = useRouter()

const lastUsage = ref<{
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  text_tokens?: number
  reasoning_tokens?: number
  cached_input_tokens?: number
} | null>(null)

const conversation = shallowRef<ChatMessage[]>([])
const currentChat = useCurrentChat()

const lastAssistantMessageId = computed<string | null>(() => {
  const lastAssistant = conversation.value.findLast(
    message => message.role === 'assistant',
  )
  return lastAssistant ? lastAssistant.id : null
})

interface ReasoningEffortOption {
  value: ReasoningEffort
  label: string
}

const allReasoningEffortOptions: ReasoningEffortOption[] = [
  { value: 'none', label: 'None' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'xhigh', label: 'XHigh' },
]

const { getSupportedParameters } = useOpenRouterModels()

const currentReasoningCapability = computed(() => {
  const currentModelId = typeof model.value === 'string' ? model.value : ''
  return resolveReasoningCapability({
    platform: platform.value,
    modelId: currentModelId,
    openRouterSupportedParameters:
      platform.value === 'openrouter'
        ? getSupportedParameters(currentModelId)
        : undefined,
  })
})

const reasoningEffortOptions = computed(() => {
  const allowed = currentReasoningCapability.value.allowedEfforts
  return allReasoningEffortOptions.filter(option =>
    allowed.includes(option.value),
  )
})

watchEffect(() => {
  const nextEffort = resolveReasoningEffortPreference(
    currentReasoningCapability.value,
    openaiReasoningEffort.value,
  )
  if (openaiReasoningEffort.value !== nextEffort) {
    openaiReasoningEffort.value = nextEffort
  }
})

const showReasoningEffortSelector = computed(() => {
  return (
    currentReasoningCapability.value.selectorKind === 'effort'
    && reasoningEffortOptions.value.length > 0
  )
})

const selectedReasoningEffort = computed<ReasoningEffortOption | undefined>({
  get() {
    return (
      reasoningEffortOptions.value.find(
        option => option.value === openaiReasoningEffort.value,
      )
      ?? reasoningEffortOptions.value.find(
        option =>
          option.value === currentReasoningCapability.value.defaultEffort,
      )
    )
  },
  set(option) {
    if (option) {
      openaiReasoningEffort.value = option.value
    }
  },
})

const reasoningProviderOptions = computed(() => {
  return buildReasoningProviderOptions({
    platform: platform.value,
    effort: openaiReasoningEffort.value,
    capability: currentReasoningCapability.value,
  })
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
    if (!isChatMessage(message)) {
      return true
    }

    if (message.role !== 'assistant') {
      return false
    }

    return (
      !Array.isArray(message.versions)
      || message.versions.length === 0
      || message.activeVersionIndex === undefined
    )
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
    const provider = getProviderFromPlatform(
      platform.value,
      apiKey.value,
      serviceUrl.value,
    )
    const languageModel = provider.getModel(modelToUse)

    const result = await streamText({
      model: languageModel,
      messages: [
        {
          role: 'system',
          content:
            'Please summarize the user\'s text and return the title of the text without adding any additional information. The title MUST in less than 4 words. Use the text language to summarize the text. Do not add any punctuation.',
        },
        {
          role: 'user',
          content: `Summarize the following text in less than 4 words: ${text}`,
        },
      ],
      allowSystemInMessages: true,
      timeout: 60_000,
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

const visibleConversation = computed(() =>
  conversation.value.filter(message => message.role !== 'system'),
)
const enableAutoScroll = ref(false)
function easeInOutQuad(
  time: number,
  start: number,
  change: number,
  duration: number,
) {
  time /= duration / 2
  if (time < 1) {
    return (change / 2) * time * time + start
  }
  time--
  return (-change / 2) * (time * (time - 2) - 1) + start
}
function scrollToBottomSmoothly(
  element: { scrollTop: number, scrollHeight: number, clientHeight: number },
  duration: number,
) {
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
watch(
  [input, textareaRef],
  () => {
    nextTick(() => {
      if (textareaRef.value) {
        const targetRows = getNumberOfLines(textareaRef.value)
        rows.value = targetRows
      }
    })
  },
  { immediate: true },
)
function getNumberOfLines(textarea: HTMLTextAreaElement) {
  // 收缩，获取行数，然后展开
  textarea.style.height = '0px'
  const style = globalThis.getComputedStyle(textarea)
  const lineHeight = Number.parseInt(style.lineHeight)
  const padding
    = Number.parseInt(style.paddingTop) + Number.parseInt(style.paddingBottom)
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

// 正在进行的流式请求；切换到其它会话时中止，避免旧请求继续占用连接
const activeStreamHandler = shallowRef<AIStreamHandler | null>(null)
const activeStreamChatId = ref<string | null>(null)
// 用户主动停止时保留已生成的部分内容，不追加 "Request aborted" 错误消息
const userStopRequested = ref(false)

function stopStreaming(): void {
  if (!streaming.value) {
    return
  }
  userStopRequested.value = true
  activeStreamHandler.value?.cancel()
}

watch(
  () => currentChat.value?.id,
  (newId) => {
    if (activeStreamHandler.value && newId !== activeStreamChatId.value) {
      activeStreamHandler.value.cancel()
    }
  },
)

onBeforeUnmount(() => {
  activeStreamHandler.value?.cancel()
})

interface StreamAssistantParams {
  chat: ChatData | null
  assistantMessage: ChatMessage
  currentModel: string
}

function updateChatConversation(
  chatData: ChatData | null,
  newConversation: ChatMessage[],
): ChatData | null {
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
  userStopRequested.value = false
  lastUsage.value = null
  laststartedAtMS.value = 0
  lastEndedAtMS.value = 0

  const thinkingTimeout = globalThis.setTimeout(() => {
    if (streaming.value && !laststartedAtMS.value) {
      thinking.value = true
    }
  }, 500)

  // 所有流式写入都作用在本次请求捕获的会话快照上，并按消息 id 定位；
  // 流式期间切换会话时，既不会写脏当前显示的会话，也不会把别的会话持久化到旧会话
  const streamChatId = chat?.id ?? null
  let streamConversation = [...conversation.value]

  function isStreamChatActive() {
    return streamChatId !== null && currentChat.value?.id === streamChatId
  }

  function syncStreamConversation() {
    if (streamChatId === null || isStreamChatActive()) {
      conversation.value = streamConversation
    }
  }

  function commitAssistantUpdate(
    updater: (message: ChatMessage) => ChatMessage,
  ) {
    const index = streamConversation.findIndex(
      message => message.id === assistantMessage.id,
    )
    if (index === -1) {
      return
    }
    const updated = ensureAssistantMessageStructure(
      updater(ensureAssistantMessageStructure(streamConversation[index])),
    )
    streamConversation = [...streamConversation]
    streamConversation[index] = updated
    syncStreamConversation()
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

  // 每次 delta 都携带完整累积内容，逐 token 重建会话数组开销大；
  // 按动画帧合并，一帧内只应用最后一次更新
  let pendingStreamMessage: ChatMessage | null = null
  let streamFlushFrame: number | null = null

  function queueStreamMessage(streamMessage: ChatMessage) {
    pendingStreamMessage = streamMessage
    streamFlushFrame ??= requestAnimationFrame(() => {
      streamFlushFrame = null
      flushPendingStreamMessage()
    })
  }

  function flushPendingStreamMessage() {
    if (streamFlushFrame !== null) {
      cancelAnimationFrame(streamFlushFrame)
      streamFlushFrame = null
    }
    const pending = pendingStreamMessage
    pendingStreamMessage = null
    if (pending) {
      applyStreamMessage(pending)
    }
  }

  function discardPendingStreamMessage() {
    if (streamFlushFrame !== null) {
      cancelAnimationFrame(streamFlushFrame)
      streamFlushFrame = null
    }
    pendingStreamMessage = null
  }

  const handler = new AIStreamHandler()
  activeStreamHandler.value = handler
  activeStreamChatId.value = streamChatId

  try {
    const provider = getProviderFromPlatform(
      platform.value,
      apiKey.value,
      serviceUrl.value,
    )
    const languageModel = provider.getModel(currentModel)

    const messages = chatMessagesToModelMessages(
      streamConversation.slice(0, -1),
    )

    const result = await handler.streamCompletion({
      model: languageModel,
      messages,
      preset: platform.value,
      providerOptions: reasoningProviderOptions.value,
      timeout: requestTimeout.value,
      onUpdate: (updatedMessage: ChatMessage) => {
        if (laststartedAtMS.value === 0) {
          laststartedAtMS.value = Date.now()
        }

        if (thinking.value) {
          thinking.value = false
        }

        queueStreamMessage(updatedMessage)
      },
      onFinish: (finalMessage: ChatMessage, usage?: any) => {
        lastEndedAtMS.value = Date.now()
        thinking.value = false

        if (usage) {
          lastUsage.value = {
            prompt_tokens: usage.inputTokens,
            completion_tokens: usage.outputTokens,
            total_tokens: usage.totalTokens,
            text_tokens: usage.textTokens,
            reasoning_tokens: usage.reasoningTokens,
            cached_input_tokens: usage.cachedInputTokens,
          }

          if (chat) {
            chat.token.inTokens += usage.inputTokens
            chat.token.outTokens += usage.outputTokens
          }
        }

        // 最终消息覆盖一切，丢弃可能滞留的中间帧，避免旧内容在其后回写
        discardPendingStreamMessage()
        applyStreamMessage(finalMessage)

        cacheSuccessfulRequest({
          preset: platform.value || 'openai',
          serviceUrl: serviceUrl.value!,
          model: currentModel,
          apiKey: apiKey.value,
        })
      },
    })

    const stoppedByUser
      = userStopRequested.value && result.error?.name === 'AbortError'
    if (result.error && !stoppedByUser) {
      console.error('Stream completion failed:', result.error)
      streamConversation = [...streamConversation, result.message]
      syncStreamConversation()
    }
  }
  catch (error: unknown) {
    console.error('Stream completion failed:', error)
    const message
      = error instanceof Error ? error.message : 'Failed to get response from AI'
    const errorMessage = createChatMessage('error', message, {
      sentAt: assistantMessage.metadata?.sentAt || Date.now(),
      receivedAt: Date.now(),
    })
    streamConversation = [...streamConversation, errorMessage]
    syncStreamConversation()
  }
  finally {
    // 错误/中断路径上把最后一帧未落地的部分内容应用掉（正常完成时是 no-op）
    flushPendingStreamMessage()
    globalThis.clearTimeout(thinkingTimeout)
    streaming.value = false
    thinking.value = false
    if (activeStreamHandler.value === handler) {
      activeStreamHandler.value = null
      activeStreamChatId.value = null
    }

    const lastAssistantIndex = streamConversation.findLastIndex(
      message => message.role === 'assistant',
    )
    if (lastAssistantIndex !== -1) {
      const lastAssistant = streamConversation[lastAssistantIndex]
      if (lastAssistant.metadata && !lastAssistant.metadata.receivedAt) {
        streamConversation = [...streamConversation]
        streamConversation[lastAssistantIndex] = {
          ...lastAssistant,
          metadata: { ...lastAssistant.metadata, receivedAt: Date.now() },
        }
        syncStreamConversation()
      }
    }

    if (chat) {
      const normalized = normalizeChatMessages(streamConversation)
      const updatedChat: ChatData = {
        ...toRaw(chat),
        conversation: normalized,
      }
      setChat(updatedChat)
      if (isStreamChatActive()) {
        conversation.value = normalized
      }
      if (!updatedChat.title) {
        const aiMessage = normalized
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
  if (
    (input.value.trim() === '' && uploadedImages.value.length === 0)
    || streaming.value
  ) {
    return
  }

  // 聊天历史尚未加载完成时，当前路由对应的会话可能还不在内存里，
  // 此时发送会被当成新会话分叉出去
  if (!chatHistoryLoaded.value) {
    console.warn('Chat history is still loading; please retry in a moment.')
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

  const normalizedAssistantIndex = conversation.value.findLastIndex(
    message => message.role === 'assistant',
  )
  const normalizedAssistantMessage
    = normalizedAssistantIndex === -1
      ? ensureAssistantMessageStructure(assistantMessage)
      : ensureAssistantMessageStructure(
          conversation.value[normalizedAssistantIndex],
        )

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

// 重新生成任意一条助手消息：截断其后的对话，在原消息上叠加新版本
async function regenerateAssistantMessage({
  messageId,
}: {
  messageId: string
}): Promise<void> {
  if (streaming.value) {
    return
  }

  const assistantIndex = conversation.value.findIndex(
    message => message.id === messageId,
  )
  if (
    assistantIndex === -1
    || conversation.value[assistantIndex].role !== 'assistant'
  ) {
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

  const baseMessage = ensureAssistantMessageStructure(
    conversation.value[assistantIndex],
  )
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

function deleteMessage({ messageId }: { messageId: string }): void {
  if (streaming.value) {
    return
  }
  const next = conversation.value.filter(
    message => message.id !== messageId,
  )
  if (next.length === conversation.value.length) {
    return
  }
  updateChatConversation(currentChat.value, next)
}

async function editUserMessage({
  messageId,
  content,
}: {
  messageId: string
  content: string
}): Promise<void> {
  if (streaming.value) {
    console.warn('Cannot edit messages while streaming.')
    return
  }

  const chat = currentChat.value
  if (!chat) {
    console.error('No active chat to edit.')
    return
  }

  const targetIndex = conversation.value.findIndex(
    message => message.id === messageId,
  )
  if (targetIndex === -1) {
    return
  }

  const targetMessage = conversation.value[targetIndex]
  if (
    targetMessage.role !== 'user'
    || typeof targetMessage.content !== 'string'
  ) {
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
  activeChat
    = updateChatConversation(activeChat, conversation.value) ?? activeChat

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

function changeAssistantMessageVersion({
  messageId,
  index,
}: {
  messageId: string
  index: number
}): void {
  const targetIndex = conversation.value.findIndex(
    message => message.id === messageId,
  )
  if (targetIndex === -1) {
    return
  }

  const updatedMessage = setAssistantMessageActiveVersion(
    conversation.value[targetIndex],
    index,
  )
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
      text_tokens: metadata.usage.text_tokens,
      reasoning_tokens: metadata.usage.reasoning_tokens,
      cached_input_tokens: metadata.usage.cached_input_tokens,
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
        const lineHeight = Number.parseInt(
          globalThis.getComputedStyle(target).lineHeight,
        )
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
        class="m-auto h-full max-w-chat w-full overflow-x-hidden overflow-y-auto px-4 text-3.5rem font-medium leading-4rem"
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
              class="w-full flex flex-row justify-between rounded-xl bg-neutral-200 p-4 leading-0 shadow-sm transition-colors md:h-200px md:w-200px md:flex-col dark:bg-neutral-800 hover:bg-neutral-300 md:p-5 dark:hover:bg-neutral-7 dark:hover:bg-neutral-700"
              @click="router.push({ name: 'translate' })"
            >
              <div class="flex items-center gap-2">
                <div
                  class="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500/20"
                >
                  <i class="i-tabler-language h-5 w-5 text-blue-400" />
                </div>
                <div class="text-base font-medium">
                  Translate
                </div>
              </div>
              <div
                class="ml-auto hidden items-center text-xs text-neutral-5 md:ml-0 md:mt-4 md:flex"
              >
                Easily translate between multiple languages
              </div>
            </button>
          </div>
        </div>
      </div>
      <div
        v-else
        ref="scrollArea"
        class="overflow-x-hidden overflow-y-auto"
      >
        <Virtualizer
          v-slot="{ item: c, index }"
          :data="visibleConversation"
        >
          <ChatMessage
            :key="c.id"
            :message="c"
            :class="
              index === visibleConversation.length - 1
                ? 'min-h-[calc(100dvh-152px-72px)]'
                : ''
            "
            :loading="streaming && c.id === lastAssistantMessageId"
            :thinking="thinking && c.id === lastAssistantMessageId"
            :show-regenerate="c.role === 'assistant' && !streaming"
            :allow-user-edit="!streaming"
            :allow-delete="!streaming"
            @change-version="changeAssistantMessageVersion"
            @regenerate="regenerateAssistantMessage"
            @edit-message="editUserMessage"
            @delete-message="deleteMessage"
          />
        </Virtualizer>
      </div>
      <div
        class="input-section relative min-h-120px flex shrink-0 flex-col items-center justify-end gap-1 px-4"
      >
        <div
          class="z-10 h-20px flex flex-col items-center rounded-md text-sm op50 shadow-sm"
        >
          <!-- 性能指标 -->
          <div
            v-if="lastUsage && lastTimeUsageMS > 0"
            class="flex items-center gap-1"
          >
            <div>
              <span class="mr-1 font-medium">Current:</span>
              <i class="i-tabler-arrow-up h-3 w-3" />{{ lastUsage.prompt_tokens }}
              <i class="i-tabler-arrow-down ml-0.5 h-3 w-3" />{{ lastUsage.completion_tokens }}
              <template
                v-if="
                  lastUsage.reasoning_tokens
                    && lastUsage.reasoning_tokens > 0
                "
              >
                <span class="op70">
                  (<i class="i-tabler-message h-3 w-3" />{{ lastUsage.text_tokens ?? (lastUsage.completion_tokens - lastUsage.reasoning_tokens) }}
                  <i class="i-tabler-brain ml-0.5 h-3 w-3" />{{ lastUsage.reasoning_tokens }})
                </span>
              </template>
            </div>
            <template
              v-if="
                lastUsage.cached_input_tokens
                  && lastUsage.cached_input_tokens > 0
              "
            >
              ·
              <div>
                <i class="i-tabler-bolt h-3 w-3" />{{ lastUsage.cached_input_tokens }}
              </div>
            </template>
            ·
            <div>
              <span class="mr-1 font-medium">Speed:</span>
              <span>{{
                (
                  (lastUsage.completion_tokens / lastTimeUsageMS)
                  * 1000
                ).toFixed(2)
              }}
                Token/s</span>
            </div>
          </div>
          <!-- 合并的输入/输出统计 -->
          <div
            v-if="
              currentChat
                && currentChat.token.inTokens > 0
                && currentChat.token.outTokens > 0
            "
            class="mr-6 flex items-center"
          >
            <span class="mr-1 font-medium">Total Input/Output:</span>
            <span>
              {{ currentChat.token.inTokens }} /
              {{ currentChat.token.outTokens }} Token
            </span>
          </div>
        </div>
        <div class="relative z-10 max-w-chat w-full leading-0">
          <!-- Image preview area above input panel -->
          <div
            v-if="uploadedImages.length > 0"
            class="mb-3 flex flex-wrap gap-3 pt-3"
          >
            <div
              v-for="image in uploadedImages"
              :key="image.id"
              class="group relative"
            >
              <img
                :src="image.dataUrl"
                :alt="image.file.name"
                loading="lazy"
                decoding="async"
                class="h-16 w-16 border border-neutral-300 rounded-lg object-cover dark:border-neutral-6"
              >
              <button
                class="absolute h-6 w-6 flex items-center justify-center rounded-full bg-neutral-300 opacity-0 transition-opacity -right-2 -top-2 dark:bg-neutral-800 hover:bg-neutral-400 group-hover:opacity-100 dark:hover:bg-neutral-7"
                @click="
                  uploadedImages = uploadedImages.filter(
                    (img: ImageFile) => img.id !== image.id,
                  )
                "
              >
                <i class="i-tabler-x h-4 w-4 text-neutral-3" />
              </button>
            </div>
          </div>

          <!-- Unified input panel -->
          <div
            class="relative rounded-xl bg-neutral-100 transition-all dark:bg-elevated focus-within:bg-neutral-200 hover:bg-neutral-200 dark:focus-within:bg-elevated-hover dark:hover:bg-elevated-hover"
          >
            <!-- Textarea without border -->
            <textarea
              ref="textareaRef"
              v-model="input"
              type="text"
              style="
                resize: none;
                scrollbar-width: none;
                max-height: 300px;
                height: auto;
              "
              :rows="rows"
              class="w-full flex-grow-0 border-none bg-transparent px-4 py-4 text-lg text-neutral-800 outline-none dark:text-[#e3e3e3]"
              placeholder="Input your question here"
              @keydown.stop.up="
                async (e) => {
                  if (!(input === '')) return;
                  const target = e.target as HTMLTextAreaElement;
                  if (target.selectionStart === 0) {
                    const currentIdx = inputHistory.history.value
                      .map((d) => d.snapshot)
                      .indexOf(input);
                    if (currentIdx === -1) {
                      input = inputHistory.history.value[0].snapshot;
                    }
                    else {
                      input
                        = inputHistory.history.value[
                          (currentIdx + 1) % inputHistory.history.value.length
                        ].snapshot;
                    }
                  }
                }
              "
              @keypress.stop.prevent.enter="onEnter"
            />

            <!-- Bottom buttons (stacked below textarea) -->
            <div class="flex items-center justify-between px-4 pb-3">
              <!-- Image upload button - bottom left -->
              <div>
                <ImageUpload v-model="uploadedImages" />
              </div>

              <!-- Prompt optimize and send buttons - bottom right -->
              <div class="flex items-center gap-2">
                <div
                  v-if="showReasoningEffortSelector"
                  class="flex items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400"
                >
                  <span> Effort </span>
                  <DropdownSelect
                    v-model="selectedReasoningEffort"
                    :options="reasoningEffortOptions"
                    label-key="label"
                    placeholder="Select effort"
                    direction="up"
                    class="w-24"
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
                  class="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 transition-all dark:text-neutral-300"
                  :class="{
                    'opacity-50 cursor-not-allowed':
                      streaming || !sttSupported || sttTranscribing,
                    'hover:bg-neutral-200 dark:hover:bg-neutral-700':
                      !streaming && sttSupported && !sttTranscribing,
                    'bg-red-500/20': isRecording,
                  }"
                  @click="onMicClick"
                >
                  <i
                    v-if="sttTranscribing"
                    class="i-tabler-loader-2 h-4 w-4 animate-spin"
                  />
                  <i
                    v-else-if="isRecording"
                    class="i-tabler-player-stop h-5 w-5"
                  />
                  <i v-else class="i-tabler-microphone h-5 w-5" />
                </button>
                <!-- Prompt optimize button -->
                <PromptOptimizeButton
                  v-model="input"
                  :disabled="streaming"
                  size="md"
                  variant="ghost"
                />

                <!-- Send button -->
                <button
                  v-if="streaming"
                  class="h-8 w-8 flex items-center justify-center rounded-full bg-neutral-900 text-white transition-all dark:bg-neutral-100 hover:bg-neutral-700 dark:text-neutral-900 dark:hover:bg-white"
                  aria-label="Stop generating"
                  title="Stop generating"
                  @click="stopStreaming"
                >
                  <i class="i-tabler-player-stop-filled h-4 w-4" />
                </button>
                <button
                  v-else
                  :disabled="!input.trim() && uploadedImages.length === 0"
                  :class="
                    input.trim() || uploadedImages.length > 0
                      ? 'bg-neutral-900 text-white hover:bg-neutral-700 dark:bg-neutral-100 dark:text-neutral-900 dark:hover:bg-white'
                      : 'text-neutral-400 opacity-50 cursor-not-allowed dark:text-neutral-500'
                  "
                  class="h-8 w-8 flex items-center justify-center rounded-full transition-all"
                  aria-label="Send message"
                  title="Send message"
                  @click="onSubmit"
                >
                  <i class="i-tabler-send h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div
          class="animate-fade-delay flex animate-delay-500 gap-2 pb-3 pt-1 text-xs color-[#6d6d6d] dark:color-[#c4c7c5]"
        >
          <span> Jannchie's Web UI for Chat Services </span>
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
