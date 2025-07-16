<script setup lang="ts">
import type { ImageContent, ImageFile, MessageContent, TextContent } from '../composables/useHelloWorld'
import type { ChatMessage, TransformOptions } from '../types/message'
import OpenAI from 'openai'
import { useRequestCache } from '../composables/useRequestCache'
import { useScrollToBottom } from '../composables/useScrollToBottom'
import { apiKey, client, model, platform, serviceUrl, useCurrentChat, useResponsesAPI } from '../shared'
import { generateId, isMobile, setChat } from '../utils'
import { createUIMessage, transformMessages, updateMessageContent, updateMessageReasoning } from '../utils/messageTransform'

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
    )

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
        messages: apiMessages as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
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
    for await (const chunk of stream) {
      if (useResponsesAPI.value) {
        // Handle Responses API format
        if (chunk.type === 'response.done') {
          lastEndedAtMS.value = Date.now()
          if (chunk.response?.usage) {
            lastUsage.value = {
              prompt_tokens: chunk.response.usage.input_tokens || 0,
              completion_tokens: chunk.response.usage.output_tokens || 0,
              total_tokens: (chunk.response.usage.input_tokens || 0) + (chunk.response.usage.output_tokens || 0),
            }
            if (chat) {
              chat.token.inTokens += chunk.response.usage.input_tokens || 0
              chat.token.outTokens += chunk.response.usage.output_tokens || 0
            }
          }
          streamCompleted = true

          // 更新最后一条消息的 receivedAt 时间戳 (Responses API)
          const lastMessage = conversation.value.at(-1)
          if (lastMessage && lastMessage.role === 'assistant') {
            const updatedMessage = {
              ...lastMessage,
              metadata: {
                ...lastMessage.metadata,
                receivedAt: Date.now(),
              },
            }
            conversation.value[conversation.value.length - 1] = updatedMessage
          }
        }

        if (chunk.type === 'response.content_part.added' || chunk.type === 'response.text.delta') {
          if (!lastMessage) {
            return
          }

          if (laststartedAtMS.value === 0) {
            laststartedAtMS.value = Date.now()
            if (lastMessage.metadata) {
              lastMessage.metadata.receivedAt = Date.now()
            }
          }

          let deltaContent = ''
          if (chunk.type === 'response.content_part.added' && chunk.part?.type === 'text') {
            deltaContent = chunk.part.text || ''
          }

          if (chunk.type === 'response.text.delta') {
            deltaContent = chunk.delta || ''
          }

          if (deltaContent) {
            // 使用新的消息更新函数
            const updatedMessage = updateMessageContent(lastMessage, deltaContent, { appendMode: true })
            // 更新最后一个消息
            conversation.value[conversation.value.length - 1] = updatedMessage
          }
        }
      }
      else {
        // Handle Chat Completions API format (original)
        const usage = chunk.usage
        if (usage) {
          lastEndedAtMS.value = Date.now()
          lastUsage.value = usage
          if (chat) {
            chat.token.inTokens += usage.prompt_tokens
            chat.token.outTokens += usage.completion_tokens
          }
          streamCompleted = true

          // 更新最后一条消息的 receivedAt 时间戳 (Chat Completions API)
          const lastMessage = conversation.value.at(-1)
          if (lastMessage && lastMessage.role === 'assistant') {
            const updatedMessage = {
              ...lastMessage,
              metadata: {
                ...lastMessage.metadata,
                receivedAt: Date.now(),
              },
            }
            conversation.value[conversation.value.length - 1] = updatedMessage
          }
        }

        const lastMessage = conversation.value.at(-1)
        if (chunk.choices.length === 0) {
          continue
        }

        const delta = chunk.choices[0].delta as any
        if (!delta) {
          continue
        }

        if (laststartedAtMS.value === 0) {
          laststartedAtMS.value = Date.now()
        }
        if (!lastMessage) {
          return
        }

        let messageUpdated = false

        if (delta.content) {
          // 使用新的消息更新函数更新内容
          const updatedMessage = updateMessageContent(lastMessage, delta.content, { appendMode: true })
          conversation.value[conversation.value.length - 1] = updatedMessage
          messageUpdated = true
        }

        if (delta.reasoning && lastMessage.role === 'assistant') {
          // 使用新的消息更新函数更新 reasoning
          const currentMessage = conversation.value.at(-1)!
          const updatedMessage = updateMessageReasoning(currentMessage, delta.reasoning, true)
          conversation.value[conversation.value.length - 1] = updatedMessage
          messageUpdated = true
        }

        // 如果消息有更新，触发响应式更新
        if (messageUpdated) {
          conversation.value = [...conversation.value]
        }
      }
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
        class="m-auto h-full max-w-830px w-full overflow-x-hidden overflow-y-auto px-4 text-3.5rem font-medium leading-4rem"
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
              class="w-full flex flex-row justify-between rounded-xl bg-neutral-8 p-4 leading-0 shadow-sm transition-colors md:h-200px md:w-200px md:flex-col hover:bg-neutral-7 md:p-5"
              @click="router.push({ name: 'translate' })"
            >
              <div class="flex items-center gap-2">
                <div class="h-8 w-8 flex items-center justify-center rounded-lg bg-blue-500/20">
                  <i class="i-tabler-language h-5 w-5 text-blue-400" />
                </div>
                <div class="text-base font-medium">
                  Translate
                </div>
              </div>
              <div class="ml-auto hidden items-center text-xs text-neutral-5 md:ml-0 md:mt-4 md:flex">
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
      <div class="input-section relative min-h-120px flex shrink-0 flex-col items-center justify-end gap-1 px-4">
        <div
          v-if="currentChat?.token"
          class="z-10 flex flex-col items-center rounded-md text-sm op50 shadow-sm"
        >
          <!-- 性能指标 -->
          <div
            v-if="lastUsage && lastTimeUsageMS > 0"
            class="flex items-center gap-1"
          >
            <div>
              <span class="mr-1 font-medium">Current:</span>
              <span>{{ lastUsage.prompt_tokens }} / {{ lastUsage.completion_tokens }} Token</span>
            </div>
            ·
            <div>
              <span class="mr-1 font-medium">Speed:</span>
              <span>{{ (lastUsage.completion_tokens / lastTimeUsageMS * 1000).toFixed(2) }} Token/s</span>
            </div>
          </div>
          <!-- 合并的输入/输出统计 -->
          <div
            v-if="currentChat.token.inTokens > 0 && currentChat.token.outTokens > 0"
            class="mr-6 flex items-center"
          >
            <span class="mr-1 font-medium">Total Input/Output:</span>
            <span>
              {{ currentChat.token.inTokens }} / {{ currentChat.token.outTokens }} Token
            </span>
          </div>
        </div>
        <div class="relative z-10 max-w-830px w-full leading-0">
          <!-- Image preview area above input panel -->
          <div v-if="uploadedImages.length > 0" class="mb-3 flex flex-wrap gap-3 pt-3">
            <div
              v-for="image in uploadedImages"
              :key="image.id"
              class="group relative"
            >
              <img
                :src="image.dataUrl"
                :alt="image.file.name"
                class="h-16 w-16 border border-neutral-6 rounded-lg object-cover"
              >
              <button
                class="absolute h-6 w-6 flex items-center justify-center rounded-full bg-neutral-8 opacity-0 transition-opacity -right-2 -top-2 hover:bg-neutral-7 group-hover:opacity-100"
                @click="uploadedImages = uploadedImages.filter(img => img.id !== image.id)"
              >
                <i class="i-tabler-x h-4 w-4 text-neutral-3" />
              </button>
            </div>
          </div>

          <!-- Unified input panel -->
          <div
            class="relative rounded-xl bg-[#1e1e1f] transition-all focus-within:bg-neutral-8 hover:bg-neutral-8"
          >
            <!-- Textarea without border -->
            <textarea
              ref="textareaRef"
              v-model="input"
              type="text"
              style="resize: none; scrollbar-width: none; max-height: 300px; height: auto;"
              :rows="rows"
              class="w-full flex-grow-0 border-none bg-transparent px-4 py-4 pb-12 text-lg text-[#e3e3e3] outline-none"
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
            <div class="absolute bottom-2 left-2 right-2 flex items-center justify-between">
              <!-- Image upload button - bottom left -->
              <div>
                <ImageUpload v-model="uploadedImages" />
              </div>

              <!-- Send button - bottom right -->
              <button
                :disabled="streaming"
                :class="{
                  'opacity-0': !input.trim() && uploadedImages.length === 0,
                }"
                class="h-8 w-8 flex items-center justify-center rounded-lg color-[#c4c7c5] transition-all hover:bg-neutral-7"
                @click="onSubmit"
              >
                <i class="i-tabler-send h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
        <div class="animate-fade-delay flex animate-delay-500 gap-2 pb-3 pt-1 text-xs color-[#c4c7c5]">
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
