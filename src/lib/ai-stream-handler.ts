import type { LanguageModel, ModelMessage } from 'ai'
import type { ProviderOptions } from '../types/ai'
import type { ChatMessage } from '../types/message'
import { streamText } from 'ai'
import { createChatMessage, updateChatMessageContent } from './message-converter'

export interface StreamOptions {
  model: LanguageModel
  messages: ModelMessage[]
  onUpdate?: (message: ChatMessage) => void
  onFinish?: (message: ChatMessage, usage?: UsageInfo) => void
  onError?: (error: Error) => void
  preset?: string
  providerOptions?: ProviderOptions
}

export interface UsageInfo {
  inputTokens: number
  outputTokens: number
  totalTokens: number
}

export interface StreamResult {
  message: ChatMessage
  usage?: UsageInfo
  error?: Error
}

export class AIStreamHandler {
  private currentMessage: ChatMessage | null = null
  private startTime = 0
  private firstTokenTime = 0
  private abortController: AbortController | null = null

  async streamCompletion(options: StreamOptions): Promise<StreamResult> {
    const {
      model,
      messages,
      onUpdate,
      onFinish,
      preset,
      providerOptions,
    } = options

    this.startTime = Date.now()
    this.firstTokenTime = 0
    this.abortController = new AbortController()
    // reset per-call state

    // Create the initial assistant message placeholder
    this.currentMessage = createChatMessage('assistant', '', {
      sentAt: this.startTime,
      model: (model as any).modelId || (model as any).name || (typeof model === 'string' ? model : 'unknown'),
      preset,
    })

    try {
      let streamError: Error | null = null

      const result = streamText({
        model,
        messages,
        // No internal retries
        maxRetries: 0,
        abortSignal: this.abortController?.signal,
        providerOptions,
        onError: (event) => {
          console.error('Stream internal error:', event.error)
          streamError = event.error instanceof Error ? event.error : new Error(String(event.error))
          // Do not throw immediately; handle after stream consumption
        },
      })

      let fullContent = ''
      let usage: UsageInfo | undefined

      let fullReasoning = ''

      // Prefer fullStream to handle all event types, including reasoning
      try {
        for await (const event of result.fullStream) {
          if (event.type === 'text-delta') {
            if (this.firstTokenTime === 0) {
              this.firstTokenTime = Date.now()
              // Update first token timestamp
              if (this.currentMessage?.metadata) {
                this.currentMessage.metadata.firstTokenAt = this.firstTokenTime
              }
            }

            const textDelta = 'text' in event && typeof (event as any).text === 'string' ? (event as any).text : ''
            fullContent += textDelta
            this.currentMessage = updateChatMessageContent(this.currentMessage!, fullContent)
            onUpdate?.(this.currentMessage)
          }
          else if (event.type === 'reasoning-delta') {
            const reasoningText = 'text' in event && typeof (event as any).text === 'string' ? (event as any).text : ''
            if (reasoningText) {
              fullReasoning += reasoningText
              this.currentMessage = {
                ...this.currentMessage!,
                reasoning: fullReasoning,
              }
              onUpdate?.(this.currentMessage!)
            }
          }
        }
        // If the underlying stream reported an error via onError, treat this attempt as failed
        if (streamError) {
          throw streamError
        }
      }
      catch (error) {
        console.warn('fullStream not available, falling back to textStream:', error)
        // Fallback: consume textStream to at least stream textual content
        try {
          for await (const delta of (result as any).textStream ?? []) {
            if (this.firstTokenTime === 0) {
              this.firstTokenTime = Date.now()
              if (this.currentMessage?.metadata) {
                this.currentMessage.metadata.firstTokenAt = this.firstTokenTime
              }
            }
            const textDelta = typeof delta === 'string' ? delta : ''
            fullContent += textDelta
            this.currentMessage = updateChatMessageContent(this.currentMessage!, fullContent)
            onUpdate?.(this.currentMessage)
          }
          // If the underlying stream reported an error via onError, propagate to outer retry logic
          if (streamError) {
            throw streamError
          }
        }
        catch (fallbackError) {
          console.error('textStream fallback failed:', fallbackError)
          throw fallbackError
        }
      }

      // If the underlying stream reported an error via onError, propagate
      if (streamError) {
        throw streamError
      }

      // Fetch final usage if available
      try {
        const finalUsage = await result.usage
        if (finalUsage) {
          usage = {
            inputTokens: finalUsage.inputTokens || 0,
            outputTokens: finalUsage.outputTokens || 0,
            totalTokens: finalUsage.totalTokens || ((finalUsage.inputTokens || 0) + (finalUsage.outputTokens || 0)),
          }
        }
      }
      catch (usageError) {
        console.warn('Failed to get usage information:', usageError)
        // Proceed even if usage retrieval fails
      }

      // Update final message metadata
      const receivedAt = Date.now()
      const tokenSpeed = usage && this.firstTokenTime > 0
        ? (usage.outputTokens / ((receivedAt - this.firstTokenTime) / 1000))
        : undefined

      this.currentMessage = {
        ...this.currentMessage,
        metadata: {
          ...this.currentMessage?.metadata,
          receivedAt,
          model: this.currentMessage?.metadata?.model || (model as any).modelId || (model as any).name || (typeof model === 'string' ? model : 'unknown'),
          preset: this.currentMessage?.metadata?.preset || preset,
          usage: usage
            ? {
                input_tokens: usage.inputTokens,
                output_tokens: usage.outputTokens,
                total_tokens: usage.totalTokens,
              }
            : undefined,
          tokenSpeed,
        },
      }

      // Only call finish when there was no streaming error
      onFinish?.(this.currentMessage, usage)

      return {
        message: this.currentMessage,
        usage,
      }
    }
    catch (error) {
      // Abort: return immediately
      if (error instanceof Error && error.name === 'AbortError') {
        const abortMessage = 'Request aborted'
        const errorChatMessage = createChatMessage('error', abortMessage, {
          sentAt: this.startTime,
          receivedAt: Date.now(),
        })
        return {
          message: errorChatMessage,
          error,
        }
      }

      // Normalize error message
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        // Check AI SDK aggregated retry error format, although we disable retries
        if (error.name === 'AI_RetryError' || error.message.includes('Failed after')) {
          const lastErrorMatch = error.message.match(/Last error: (.+)/)
          errorMessage = lastErrorMatch ? lastErrorMatch[1] : error.message
        }
        else {
          errorMessage = error.message
        }
      }

      console.error('AI request failed:', error)

      const errorChatMessage = createChatMessage('error', errorMessage, {
        sentAt: this.startTime,
        receivedAt: Date.now(),
      })

      return {
        message: errorChatMessage,
        error: error instanceof Error ? error : new Error(errorMessage),
      }
    }
  }

  /**
   * Cancel the current streaming request if in progress.
   */
  cancel() {
    if (this.abortController) {
      this.abortController.abort()
    }
  }
}

/**
 * Helper to create and use a streaming handler in one call
 */
export async function createStreamCompletion(options: StreamOptions): Promise<StreamResult> {
  const handler = new AIStreamHandler()
  return handler.streamCompletion(options)
}
