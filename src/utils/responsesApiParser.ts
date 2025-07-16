import type { ChatMessage } from '../types/message'
import type {
  ResponseCompletedEvent,
  ResponseContentPartAddedEvent,
  ResponseContentPartDoneEvent,
  ResponseCreatedEvent,
  ResponseOutputItemAddedEvent,
  ResponseOutputItemDoneEvent,
  ResponseStreamEvent,
  ResponseTextDeltaEvent,
  ResponseTextDoneEvent,
  ResponseUsage,
} from '../types/stream'
import { createUIMessage, updateMessageContent } from './messageTransform'

/**
 * Responses API 流式响应解析器
 * @deprecated 请使用 UnifiedStreamParser 替代
 */
export class ResponsesApiParser {
  private currentMessage: ChatMessage | null = null
  private textAccumulator = ''
  private sentAt: number = 0
  private responseMetadata: { model?: string } = {}
  private usageData: ResponseUsage | null = null

  constructor(
    private onMessageUpdate: (message: ChatMessage) => void,
    private onMessageComplete: (message: ChatMessage) => void,
    private onUsageUpdate?: (usage: ResponseUsage) => void,
  ) {}

  /**
   * 解析单个 SSE 事件
   */
  parseEvent(event: ResponseStreamEvent): void {
    switch (event.type) {
      case 'response.created': {
        this.handleResponseCreated(event as ResponseCreatedEvent)
        break
      }
      case 'response.output_item.added': {
        this.handleOutputItemAdded(event as ResponseOutputItemAddedEvent)
        break
      }
      case 'response.content_part.added': {
        this.handleContentPartAdded(event as ResponseContentPartAddedEvent)
        break
      }
      case 'response.output_text.delta': {
        this.handleOutputTextDelta(event as ResponseTextDeltaEvent)
        break
      }
      case 'response.output_text.done': {
        this.handleOutputTextDone(event as ResponseTextDoneEvent)
        break
      }
      case 'response.content_part.done': {
        this.handleContentPartDone(event as ResponseContentPartDoneEvent)
        break
      }
      case 'response.output_item.done': {
        this.handleOutputItemDone(event as ResponseOutputItemDoneEvent)
        break
      }
      case 'response.completed': {
        this.handleResponseCompleted(event as ResponseCompletedEvent)
        break
      }
      default: {
        // 忽略其他事件类型
        break
      }
    }
  }

  private handleResponseCreated(event: ResponseCreatedEvent): void {
    // 保存 response 的元数据，包括模型信息
    if (event.response) {
      this.responseMetadata = {
        model: event.response.model,
      }
    }
  }

  private handleOutputItemAdded(_event: ResponseOutputItemAddedEvent): void {
    // 开始新的消息
    this.sentAt = Date.now()
    this.currentMessage = createUIMessage('assistant', '', {
      metadata: {
        sentAt: this.sentAt,
        model: this.responseMetadata.model,
      },
    })
    this.textAccumulator = ''

    // 通知消息创建
    this.onMessageUpdate(this.currentMessage)
  }

  private handleContentPartAdded(event: ResponseContentPartAddedEvent): void {
    // 内容部分添加，初始化文本
    if (event.part?.type === 'output_text') {
      this.textAccumulator = event.part.text || ''
      if (this.currentMessage) {
        this.currentMessage = updateMessageContent(
          this.currentMessage,
          this.textAccumulator,
        )
        this.onMessageUpdate(this.currentMessage)
      }
    }
  }

  private handleOutputTextDelta(event: ResponseTextDeltaEvent): void {
    if (!this.currentMessage) {
      return
    }

    // 累积文本内容
    this.textAccumulator += event.delta

    // 更新消息内容
    this.currentMessage = updateMessageContent(
      this.currentMessage,
      this.textAccumulator,
    )

    // 通知组件更新
    this.onMessageUpdate(this.currentMessage)
  }

  private handleOutputTextDone(event: ResponseTextDoneEvent): void {
    if (!this.currentMessage) {
      return
    }

    // 最终文本内容
    this.textAccumulator = event.text
    this.currentMessage = updateMessageContent(
      this.currentMessage,
      this.textAccumulator,
    )

    this.onMessageUpdate(this.currentMessage)
  }

  private handleContentPartDone(event: ResponseContentPartDoneEvent): void {
    // 内容部分完成
    if (this.currentMessage && event.part?.type === 'output_text') {
      this.currentMessage = updateMessageContent(
        this.currentMessage,
        event.part.text || this.textAccumulator,
      )
      this.onMessageUpdate(this.currentMessage)
    }
  }

  private handleOutputItemDone(_event: ResponseOutputItemDoneEvent): void {
    if (!this.currentMessage) {
      return
    }

    // 添加接收时间到metadata，并确保模型信息和usage信息保留
    this.currentMessage = {
      ...this.currentMessage,
      metadata: {
        ...this.currentMessage.metadata,
        receivedAt: Date.now(),
        model: this.currentMessage.metadata?.model || this.responseMetadata.model,
        usage: this.usageData || undefined,
      },
    }

    // 消息完成
    this.onMessageComplete(this.currentMessage)
  }

  private handleResponseCompleted(event: ResponseCompletedEvent): void {
    // 处理使用统计
    if (event.response?.usage) {
      // 标准化 usage 数据格式，兼容不同的 API
      this.usageData = {
        input_tokens: (event.response.usage as any).input_tokens || (event.response.usage as any).prompt_tokens || 0,
        output_tokens: (event.response.usage as any).output_tokens || (event.response.usage as any).completion_tokens || 0,
        total_tokens: (event.response.usage as any).total_tokens
          || ((event.response.usage as any).input_tokens || (event.response.usage as any).prompt_tokens || 0)
          + ((event.response.usage as any).output_tokens || (event.response.usage as any).completion_tokens || 0),
      } as ResponseUsage

      // 如果当前消息存在，立即更新它的 usage 信息
      if (this.currentMessage) {
        this.currentMessage = {
          ...this.currentMessage,
          metadata: {
            ...this.currentMessage.metadata,
            usage: this.usageData || undefined,
          },
        }
        this.onMessageUpdate(this.currentMessage)
      }

      if (this.onUsageUpdate) {
        this.onUsageUpdate(event.response.usage)
      }
    }
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    this.currentMessage = null
    this.textAccumulator = ''
    this.sentAt = 0
    this.responseMetadata = {}
    this.usageData = null
  }
}

/**
 * 解析 SSE 数据行
 */
export function parseSSELine(line: string): any | null {
  if (line.startsWith('data: ')) {
    try {
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        return null
      }
      return JSON.parse(data)
    }
    catch {
      return null
    }
  }
  return null
}

/**
 * 创建 Responses API 解析器的便捷函数
 * @deprecated 请使用 createUnifiedStreamParser 替代
 */
export function createResponsesApiParser(
  onMessageUpdate: (message: ChatMessage) => void,
  onMessageComplete: (message: ChatMessage) => void,
  onUsageUpdate?: (usage: ResponseUsage) => void,
): ResponsesApiParser {
  return new ResponsesApiParser(onMessageUpdate, onMessageComplete, onUsageUpdate)
}
