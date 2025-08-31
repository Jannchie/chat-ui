import type { LanguageModel, ModelMessage } from 'ai'
import type { ChatMessage } from '../types/message'
import { streamText } from 'ai'
import { createChatMessage, updateChatMessageContent } from './message-converter'

export interface StreamOptions {
  model: LanguageModel
  messages: ModelMessage[]
  onUpdate?: (message: ChatMessage) => void
  onFinish?: (message: ChatMessage, usage?: any) => void
  onError?: (error: Error) => void
  maxRetries?: number
  preset?: string // 添加 preset 信息
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

  async streamCompletion(options: StreamOptions): Promise<StreamResult> {
    const {
      model,
      messages,
      onUpdate,
      onFinish,
      onError,
      maxRetries = 3,
      preset,
    } = options

    this.startTime = Date.now()
    this.firstTokenTime = 0

    // 创建初始的助手消息
    this.currentMessage = createChatMessage('assistant', '', {
      sentAt: this.startTime,
      model: (model as any).modelId || (model as any).name || (typeof model === 'string' ? model : 'unknown'),
      preset,
    })

    let retryCount = 0

    while (retryCount <= maxRetries) {
      try {
        const result = streamText({
          model,
          messages,
          maxRetries,
        })

        let fullContent = ''
        let usage: UsageInfo | undefined

        let fullReasoning = ''

        // 使用 fullStream 来处理所有类型的数据，包括 reasoning
        try {
          for await (const event of result.fullStream) {
            if (event.type === 'text-delta') {
              if (this.firstTokenTime === 0) {
                this.firstTokenTime = Date.now()
                // 更新首次响应时间
                if (this.currentMessage?.metadata) {
                  this.currentMessage.metadata.firstTokenAt = this.firstTokenTime
                }
              }

              const textDelta = (event as any).text || ''
              fullContent += textDelta
              this.currentMessage = updateChatMessageContent(this.currentMessage!, fullContent)
              onUpdate?.(this.currentMessage)
            }
            else if (event.type === 'reasoning-delta') {
              const reasoningText = (event as any).text || ''
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
        }
        catch (error) {
          console.warn('fullStream not available, falling back to textStream:', error)

          // 回退到原来的 textStream 处理方式
          for await (const textPart of result.textStream) {
            if (this.firstTokenTime === 0) {
              this.firstTokenTime = Date.now()
              // 更新首次响应时间
              if (this.currentMessage?.metadata) {
                this.currentMessage.metadata.firstTokenAt = this.firstTokenTime
              }
            }

            fullContent += textPart
            this.currentMessage = updateChatMessageContent(this.currentMessage!, fullContent)

            onUpdate?.(this.currentMessage)
          }
        }

        // 获取最终结果
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
        catch {
          // Usage 信息获取失败，继续执行
        }

        // 更新最终消息元数据
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

        onFinish?.(this.currentMessage, usage)

        return {
          message: this.currentMessage,
          usage,
        }
      }
      catch (error) {
        retryCount++

        if (retryCount > maxRetries) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error'

          // 创建错误消息
          const errorChatMessage = createChatMessage('error', errorMessage, {
            sentAt: this.startTime,
            receivedAt: Date.now(),
          })

          onError?.(error instanceof Error ? error : new Error(errorMessage))

          return {
            message: errorChatMessage,
            error: error instanceof Error ? error : new Error(errorMessage),
          }
        }

        // 等待重试
        await new Promise(resolve => setTimeout(resolve, 1000 * 2 ** (retryCount - 1)))
      }
    }

    // 这里不应该到达，但为了类型安全
    const timeoutError = new Error('Stream timeout after retries')
    return {
      message: createChatMessage('error', 'Request failed after multiple retries', {
        sentAt: this.startTime,
        receivedAt: Date.now(),
      }),
      error: timeoutError,
    }
  }

  /**
   * 取消当前的流式处理
   */
  cancel() {
    // AI SDK 的 streamText 暂时没有直接的取消方法
    // 可以通过 AbortController 实现
  }
}

/**
 * 便捷函数：创建并使用流式处理器
 */
export async function createStreamCompletion(options: StreamOptions): Promise<StreamResult> {
  const handler = new AIStreamHandler()
  return handler.streamCompletion(options)
}
