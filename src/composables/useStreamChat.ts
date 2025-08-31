import type { ImageFile } from './chat-types'
import type { ChatMessage, MessageContent } from '../types/message'
import { createStreamCompletion } from '../lib/ai-stream-handler'
import { getProviderFromPlatform } from '../lib/ai-providers'
import { chatMessagesToModelMessages, createChatMessage } from '../lib/message-converter'
import { apiKey, model, platform, serviceUrl } from '../shared'
import { generateId } from '../utils'

export interface StreamChatOptions {
  onUpdate?: (message: ChatMessage) => void
  onFinish?: (message: ChatMessage, usage?: any) => void
  onError?: (error: Error) => void
}

export function useStreamChat() {
  const streaming = ref(false)
  const lastUsage = ref<{
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  } | null>(null)
  
  const lastStartedAtMS = ref(0)
  const lastEndedAtMS = ref(0)

  const lastTimeUsageMS = computed(() => {
    return lastEndedAtMS.value - lastStartedAtMS.value
  })

  async function sendMessage(
    conversation: ChatMessage[],
    input: string,
    uploadedImages: ImageFile[],
    options: StreamChatOptions = {}
  ): Promise<{ message: ChatMessage, error?: Error }> {
    if ((input.trim() === '' && uploadedImages.length === 0) || streaming.value) {
      throw new Error('Invalid input or already streaming')
    }

    // Lock the current model to prevent accidental switching during message sending
    const currentModel = model.value
    if (!currentModel) {
      throw new Error('Please select a model first')
    }

    streaming.value = true
    
    try {
      // Create message content based on whether images are uploaded
      let messageContent: MessageContent
      if (uploadedImages.length > 0) {
        const contentArray: Array<any> = []

        // Add text content if exists
        if (input.trim()) {
          contentArray.push({
            type: 'text',
            text: input.trim(),
          })
        }

        // Add image content
        for (const image of uploadedImages) {
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
        messageContent = `${input.trim()}\n`
      }

      // Create user message and assistant message (with timestamp)
      const userMessage = createChatMessage('user', messageContent, {
        sentAt: Date.now(),
      })
      const assistantMessage = createChatMessage('assistant', '', {
        sentAt: Date.now(),
        model: currentModel,
      })

      const updatedConversation = [...conversation, userMessage, assistantMessage]

      // Use AI SDK for streaming
      const messages = chatMessagesToModelMessages(
        updatedConversation.slice(0, -1), // Exclude the last empty assistant message
      )

      try {
        const provider = getProviderFromPlatform(platform.value, apiKey.value, serviceUrl.value)
        const languageModel = provider.getModel(currentModel)

        lastStartedAtMS.value = 0
        lastEndedAtMS.value = 0

        const result = await createStreamCompletion({
          model: languageModel,
          messages,
          preset: platform.value,
          onUpdate: (updatedMessage: ChatMessage) => {
            // Set start time on first response
            if (lastStartedAtMS.value === 0) {
              lastStartedAtMS.value = Date.now()
            }
            options.onUpdate?.(updatedMessage)
          },
          onFinish: (finalMessage: ChatMessage, usage?: any) => {
            lastEndedAtMS.value = Date.now()

            if (usage) {
              lastUsage.value = {
                prompt_tokens: usage.inputTokens,
                completion_tokens: usage.outputTokens,
                total_tokens: usage.totalTokens,
              }
            }

            options.onFinish?.(finalMessage, usage)
          },
          onError: (error: Error) => {
            const errorMessage = createChatMessage('error', error.message, {
              sentAt: assistantMessage.metadata?.sentAt || Date.now(),
              receivedAt: Date.now(),
            })
            options.onError?.(error)
          },
        })

        // If there's an error, handle it here
        if (result.error) {
          throw result.error
        }

        return { message: assistantMessage }
      }
      catch (error: any) {
        console.error('Stream completion failed:', error)
        const errorMessage = createChatMessage('error', 'Failed to get response from AI', {
          sentAt: assistantMessage.metadata?.sentAt || Date.now(),
          receivedAt: Date.now(),
        })
        return { message: errorMessage, error }
      }
    }
    finally {
      streaming.value = false
    }
  }

  return {
    streaming: readonly(streaming),
    lastUsage: readonly(lastUsage),
    lastTimeUsageMS: readonly(lastTimeUsageMS),
    sendMessage,
  }
}