<script setup lang="ts">
import type { ImageFile } from '../composables/useHelloWorld'
import type { ChatMessage, ImageContent, MessageContent, TextContent, TransformOptions } from '../types/message'
import OpenAI from 'openai'
import { useRequestCache } from '../composables/useRequestCache'
import { useScrollToBottom } from '../composables/useScrollToBottom'
import { apiKey, client, model, platform, serviceUrl, useCurrentChat, useResponsesAPI } from '../shared'
import { generateId, isMobile, setChat } from '../utils'
import { createUIMessage, transformMessages } from '../utils/messageTransform'
import { createUnifiedStreamParser } from '../utils/streamParser'

const router = useRouter()

const lastUsage = ref<OpenAI.Completions.CompletionUsage | null>(null)

const conversation = shallowRef<ChatMessage[]>([])
const currentChat = useCurrentChat()

watch([currentChat], () => {
  if (currentChat.value) {
    lastUsage.value = null
  }
})

watchEffect(() => {
  conversation.value = currentChat.value ? currentChat.value.conversation : []
})

const { cacheSuccessfulRequest } = useRequestCache()

async function generateSummary(text: string, lockedModel?: string) {
  const modelToUse = lockedModel || model.value

  let content: string | null = null

  if (useResponsesAPI.value) {
    // Use Responses API for summary
    const resp = await client.value.responses.create({
      model: modelToUse,
      input: [
        {
          role: 'system',
          content: 'Please summarize the user\'s text and return the title of the text without adding any additional information. The title MUST in less than 4 words. Use the text language to summarize the text. Do not add any punctuation. Add "📝" emoji prefix to the summary.',
        },
        {
          role: 'user',
          content: `Summarize the following text in less than 4 words: ${text}`,
        },
      ],
    })
    content = resp.output_text
  }
  else {
    // Use Chat Completions API for summary (original implementation)
    const resp = await client.value.chat.completions.create({
      model: modelToUse,
      messages: [
        {
          role: 'system',
          content: 'Please summarize the user\'s text and return the title of the text without adding any additional information. The title MUST in less than 4 words. Use the text language to summarize the text. Do not add any punctuation.',
        },
        {
          role: 'user',
          content: `Summarize the following text in less than 4 words: ${text}`,
        },
      ],
    })
    content = resp.choices[0].message.content
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
const laststartedAtMS = ref(0)
const lastEndedAtMS = ref(0)
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

  try {
    // Create message content based on whether images are uploaded
    let messageContent: MessageContent
    if (uploadedImages.value.length > 0) {
      const contentArray: Array<TextContent | ImageContent> = []

      // Add text content if exists
      if (input.value.trim()) {
        contentArray.push({
          type: 'text',
          text: input.value.trim(),
        })
      }

      // Add image content
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

    // 创建用户消息和助手消息（带时间戳）
    const userMessage = createUIMessage('user', messageContent, {
      timestamp: Date.now(),
      metadata: { sentAt: Date.now() },
    })
    const assistantMessage = createUIMessage('assistant', '', {
      timestamp: Date.now(),
      reasoning: '',
      metadata: {
        sentAt: Date.now(),
        model: currentModel,
      },
    })

    conversation.value = [...conversation.value, userMessage, assistantMessage]
    setChat(toRaw({ ...chat, conversation: conversation.value }))
    nextTick(() => {
      const el = scrollArea.value
      if (el) {
        scrollToBottomSmoothly(el, 1000)
      }
    })
    const lastMessage = conversation.value.at(-1)

    // 使用新的转换系统
    const transformOptions: TransformOptions = {
      apiType: useResponsesAPI.value ? 'responses' : 'completion',
    }

    const apiMessages = transformMessages(
      conversation.value.slice(0, -1), // 排除最后一条空的助手消息
      transformOptions,
    ) as OpenAI.Chat.Completions.ChatCompletionMessageParam[]

    let stream: AsyncIterable<any> | null = null

    const handleStreamError = (error: any) => {
      if (error instanceof OpenAI.APIError) {
        if (!lastMessage) {
          return null
        }
        lastMessage.role = 'error'
        switch (error.status) {
          case 401: {
            lastMessage.content = 'Invalid API Key.'
            break
          }
          case 403: {
            lastMessage.content = 'API Key has no permission.'
            break
          }
          case 429: {
            lastMessage.content = 'Rate limit exceeded.'
            break
          }
          default: {
            lastMessage.content = (error?.status ?? 0) >= 500 ? 'Server Error.' : 'Error.'
          }
        }
        // 设置 receivedAt 以停止计时器
        if (lastMessage.metadata) {
          lastMessage.metadata.receivedAt = Date.now()
        }
        return null
      }
      else {
        throw error
      }
    }

    if (useResponsesAPI.value) {
      // 添加 Responses API 系统消息
      const responsesMessages = [
        {
          role: 'system' as const,
          content: 'Please answer the user\'s question. If the input text is already in the target language, just rewrite with the specified tone.',
        },
        ...apiMessages,
      ]

      stream = await (client.value as any).responses.create({
        input: responsesMessages,
        model: currentModel,
        stream: true,
      }).catch(handleStreamError)
    }
    else {
      stream = await client.value.chat.completions.create({
        messages: apiMessages,
        model: currentModel,
        stream: true,
        stream_options: {
          include_usage: true,
        },
      }).catch(handleStreamError)
    }
    if (!stream) {
      return
    }
    laststartedAtMS.value = 0
    lastEndedAtMS.value = 0
    let streamCompleted = false

    // 使用统一的流式处理器
    const parser = createUnifiedStreamParser({
      onMessageUpdate: (message: ChatMessage) => {
        // 首次响应时设置开始时间
        if (laststartedAtMS.value === 0) {
          laststartedAtMS.value = Date.now()
        }

        // 查找消息在会话中的索引并更新
        const lastIndex = conversation.value.length - 1
        if (lastIndex >= 0) {
          conversation.value[lastIndex] = message
          // 触发响应式更新
          conversation.value = [...conversation.value]
        }
      },
      onMessageComplete: (message: ChatMessage) => {
        // 消息完成时更新最后一个消息
        const lastIndex = conversation.value.length - 1
        if (lastIndex >= 0) {
          conversation.value[lastIndex] = message
          conversation.value = [...conversation.value]
        }
      },
      onUsageUpdate: (usage: any) => {
        // 处理使用统计
        lastEndedAtMS.value = Date.now()
        lastUsage.value = {
          prompt_tokens: usage.input_tokens || usage.prompt_tokens || 0,
          completion_tokens: usage.output_tokens || usage.completion_tokens || 0,
          total_tokens: usage.total_tokens
            || (usage.input_tokens || usage.prompt_tokens || 0)
            + (usage.output_tokens || usage.completion_tokens || 0),
        }
        if (chat) {
          chat.token.inTokens += usage.input_tokens || usage.prompt_tokens || 0
          chat.token.outTokens += usage.output_tokens || usage.completion_tokens || 0
        }
        streamCompleted = true
      },
    })

    // 设置正确的请求发送时间
    parser.setSentTime(assistantMessage.metadata!.sentAt!)

    for await (const chunk of stream) {
      parser.parseEvent(chunk)
    }

    // Cache successful request
    if (streamCompleted) {
      cacheSuccessfulRequest({
        preset: platform.value || 'openai',
        serviceUrl: serviceUrl.value!,
        model: currentModel,
        apiKey: apiKey.value,
      })
    }
  }
  finally {
    streaming.value = false

    // 确保最后一条消息有正确的 receivedAt 字段以停止计时器
    const lastIndex = conversation.value.length - 1
    if (lastIndex >= 0) {
      const lastMessage = conversation.value[lastIndex]
      if (lastMessage.role === 'assistant' && lastMessage.metadata && !lastMessage.metadata.receivedAt) {
        lastMessage.metadata.receivedAt = Date.now()
        conversation.value = [...conversation.value]
      }
    }

    if (chat) {
      chat.conversation = conversation.value
      chat = toRaw(chat)
      setChat(chat)
      if (!chat.title) {
        const aiMessage = conversation.value.filter(d => d.role === 'assistant').map(d => d.content).join('\n')
        const summary = await generateSummary(aiMessage, currentModel)
        setChat({
          ...chat,
          title: summary,
        })
      }
    }
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
            <div class="op-25">
              What can I help you today?
            </div>
          </div>
        </div>
        <div class="mb-10 mt-20 flex gap-4">
          <div class="animate-fade-delay">
            <button
              class="dark:hover:bg-neutral-7 leading-0 p-4 rounded-xl bg-neutral-200 flex flex-row w-full shadow-sm transition-colors justify-between md:p-5 dark:bg-neutral-800 hover:bg-neutral-300 md:flex-col md:h-200px md:w-200px"
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
            class="dark:hover:bg-neutral-8 rounded-xl bg-neutral-200 transition-all relative dark:bg-[#1e1e1f] focus-within:bg-neutral-300 hover:bg-neutral-300 dark:focus-within:bg-neutral-800"
          >
            <!-- Textarea without border -->
            <textarea
              ref="textareaRef"
              v-model="input"
              type="text"
              style="resize: none; scrollbar-width: none; max-height: 300px; height: auto;"
              :rows="rows"
              class="text-lg text-neutral-800 px-4 py-4 pb-12 outline-none border-none bg-transparent flex-grow-0 w-full dark:text-[#e3e3e3]"
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

            <!-- Bottom buttons -->
            <div class="flex items-center bottom-2 left-2 right-2 justify-between absolute">
              <!-- Image upload button - bottom left -->
              <div>
                <ImageUpload v-model="uploadedImages" />
              </div>

              <!-- Prompt optimize and send buttons - bottom right -->
              <div class="flex gap-2 items-center">
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
                    'hover:bg-neutral-7': !streaming && (input.trim() || uploadedImages.length > 0),
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
        <div class="animate-fade-delay text-xs color-[#c4c7c5] pb-3 pt-1 flex gap-2 animate-delay-500">
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
