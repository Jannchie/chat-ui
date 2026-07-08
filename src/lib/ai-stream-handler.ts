import type { LanguageModel, ModelMessage, TimeoutConfiguration, ToolSet } from 'ai'
import type { ProviderOptions } from '../types/ai'
import type { ChatMessage, MessagePerformance } from '../types/message'
import { streamText } from 'ai'
import {
  createChatMessage,
  ensureAssistantMessageStructure,
  mergeChatMessageMetadata,
  updateChatMessageContent,
  updateChatMessageReasoning,
} from './message-converter'

const LAST_ERROR_REGEXP = /Last error: (.+)/

export interface StreamOptions {
  model: LanguageModel
  messages: ModelMessage[]
  onUpdate?: (message: ChatMessage) => void
  onFinish?: (message: ChatMessage, usage?: UsageInfo) => void
  onError?: (error: Error) => void
  preset?: string
  providerOptions?: ProviderOptions
  timeout?: TimeoutConfiguration<ToolSet>
}

export interface UsageInfo {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  textTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
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
  private reasoningStartTime = 0
  private reasoningEndTime = 0
  private abortController: AbortController | null = null

  async streamCompletion(options: StreamOptions): Promise<StreamResult> {
    const { model, messages, onUpdate, onFinish, preset, providerOptions, timeout }
      = options

    this.startTime = Date.now()
    this.firstTokenTime = 0
    this.reasoningStartTime = 0
    this.reasoningEndTime = 0
    this.abortController = new AbortController()
    // reset per-call state

    // Create the initial assistant message placeholder
    this.currentMessage = ensureAssistantMessageStructure(
      createChatMessage('assistant', '', {
        sentAt: this.startTime,
        model:
          (model as any).modelId
          || (model as any).name
          || (typeof model === 'string' ? model : 'unknown'),
        preset,
      }),
    )

    try {
      let streamError: Error | null = null

      const result = streamText({
        model,
        messages,
        // Chat history may legitimately contain system messages
        allowSystemInMessages: true,
        // No internal retries
        maxRetries: 0,
        abortSignal: this.abortController?.signal,
        timeout,
        providerOptions,
        onError: (event) => {
          console.error('Stream internal error:', event.error)
          streamError
            = event.error instanceof Error
              ? event.error
              : new Error(String(event.error))
          // Do not throw immediately; handle after stream consumption
        },
      })

      let fullContent = ''
      let usage: UsageInfo | undefined

      let fullReasoning = ''
      let performance: MessagePerformance | undefined

      // Prefer the full event stream to handle all event types, including reasoning
      try {
        for await (const event of result.stream) {
          switch (event.type) {
            case 'text-delta': {
              if (this.firstTokenTime === 0) {
                this.firstTokenTime = Date.now()
                // Update first token timestamp
                if (this.currentMessage?.metadata) {
                  this.currentMessage.metadata.firstTokenAt = this.firstTokenTime
                }
              }
              // Text output marks the end of the reasoning phase
              if (this.reasoningStartTime > 0 && this.reasoningEndTime === 0) {
                this.reasoningEndTime = Date.now()
                if (this.currentMessage?.metadata) {
                  this.currentMessage.metadata.reasoningEndAt = this.reasoningEndTime
                }
              }

              const textDelta
                = 'text' in event && typeof (event as any).text === 'string'
                  ? (event as any).text
                  : ''
              fullContent += textDelta
              this.currentMessage = updateChatMessageContent(
                this.currentMessage!,
                fullContent,
              )
              onUpdate?.(this.currentMessage)

              break
            }
            case 'reasoning-delta': {
              const reasoningText
                = 'text' in event && typeof (event as any).text === 'string'
                  ? (event as any).text
                  : ''
              if (reasoningText) {
                if (this.reasoningStartTime === 0) {
                  this.reasoningStartTime = Date.now()
                  if (this.currentMessage?.metadata) {
                    this.currentMessage.metadata.reasoningStartAt = this.reasoningStartTime
                  }
                }
                fullReasoning += reasoningText
                this.currentMessage = updateChatMessageReasoning(
                  this.currentMessage!,
                  fullReasoning,
                )
                onUpdate?.(this.currentMessage!)
              }

              break
            }
            case 'finish-step': {
              const perf = event.performance
              performance = {
                timeToFirstOutputMs: perf.timeToFirstOutputMs,
                outputTokensPerSecond: perf.outputTokensPerSecond,
                effectiveOutputTokensPerSecond: perf.effectiveOutputTokensPerSecond,
                responseTimeMs: perf.responseTimeMs,
                chunkGapMs: perf.timeBetweenOutputChunksMs,
              }

              break
            }
          // No default
          }
        }
        // If the underlying stream reported an error via onError, treat this attempt as failed
        if (streamError) {
          throw streamError
        }
      }
      catch (error) {
        console.warn(
          'event stream not available, falling back to textStream:',
          error,
        )
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
            this.currentMessage = updateChatMessageContent(
              this.currentMessage!,
              fullContent,
            )
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
        if (import.meta.env.DEV) {
          console.warn('[ai-stream] finalUsage', finalUsage)
        }
        if (finalUsage) {
          const raw = (finalUsage as any).raw
          const textTokens
            = finalUsage.outputTokenDetails?.textTokens
              ?? (finalUsage.outputTokens || 0) - (finalUsage.outputTokenDetails?.reasoningTokens ?? 0)
          const reasoningTokens
            = finalUsage.outputTokenDetails?.reasoningTokens
              ?? raw?.completion_tokens_details?.reasoning_tokens
          const cachedInputTokens
            = finalUsage.inputTokenDetails?.cacheReadTokens
              ?? raw?.prompt_tokens_details?.cached_tokens
          usage = {
            inputTokens: finalUsage.inputTokens || 0,
            outputTokens: finalUsage.outputTokens || 0,
            totalTokens:
              finalUsage.totalTokens
              || (finalUsage.inputTokens || 0) + (finalUsage.outputTokens || 0),
            textTokens:
              typeof textTokens === 'number' ? textTokens : undefined,
            reasoningTokens:
              typeof reasoningTokens === 'number' ? reasoningTokens : undefined,
            cachedInputTokens:
              typeof cachedInputTokens === 'number' ? cachedInputTokens : undefined,
          }
        }
      }
      catch (usageError) {
        console.warn('Failed to get usage information:', usageError)
        // Proceed even if usage retrieval fails
      }

      // Update final message metadata
      const receivedAt = Date.now()
      // Close the reasoning phase if the stream ended without any text output
      if (this.reasoningStartTime > 0 && this.reasoningEndTime === 0) {
        this.reasoningEndTime = receivedAt
      }
      // Prefer the SDK-reported speed; fall back to the local estimate
      const tokenSpeed
        = performance?.outputTokensPerSecond
          ?? (usage && this.firstTokenTime > 0
            ? usage.outputTokens / ((receivedAt - this.firstTokenTime) / 1000)
            : undefined)

      this.currentMessage = mergeChatMessageMetadata(this.currentMessage!, {
        receivedAt,
        model:
          this.currentMessage?.metadata?.model
          || (model as any).modelId
          || (model as any).name
          || (typeof model === 'string' ? model : 'unknown'),
        preset: this.currentMessage?.metadata?.preset || preset,
        usage: usage
          ? {
              input_tokens: usage.inputTokens,
              output_tokens: usage.outputTokens,
              total_tokens: usage.totalTokens,
              text_tokens: usage.textTokens,
              reasoning_tokens: usage.reasoningTokens,
              cached_input_tokens: usage.cachedInputTokens,
            }
          : undefined,
        tokenSpeed,
        performance,
        reasoningStartAt: this.reasoningStartTime > 0 ? this.reasoningStartTime : undefined,
        reasoningEndAt: this.reasoningEndTime > 0 ? this.reasoningEndTime : undefined,
      })

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

      // Timeout: the SDK aborts with a DOMException named TimeoutError
      if (error instanceof Error && error.name === 'TimeoutError') {
        const timeoutChatMessage = createChatMessage(
          'error',
          `Request timed out (${error.message})`,
          {
            sentAt: this.startTime,
            receivedAt: Date.now(),
          },
        )
        return {
          message: timeoutChatMessage,
          error,
        }
      }

      // Normalize error message
      let errorMessage = 'Unknown error'
      if (error instanceof Error) {
        // Check AI SDK aggregated retry error format, although we disable retries
        if (
          error.name === 'AI_RetryError'
          || error.message.includes('Failed after')
        ) {
          const lastErrorMatch = error.message.match(LAST_ERROR_REGEXP)
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
export async function createStreamCompletion(
  options: StreamOptions,
): Promise<StreamResult> {
  const handler = new AIStreamHandler()
  return handler.streamCompletion(options)
}
