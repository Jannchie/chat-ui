// 直接使用 any 类型处理 ResponseEvent，因为需要根据实际 OpenAI 库的事件结构
import type { ChatMessage } from '../types/message'
import { createUIMessage, updateMessageContent } from './messageTransform'

/**
 * Responses API 流式响应解析器
 */
export class ResponsesApiParser {
  private currentMessage: ChatMessage | null = null
  private textAccumulator = ''
  private sentAt: number = 0

  constructor(
    private onMessageUpdate: (message: ChatMessage) => void,
    private onMessageComplete: (message: ChatMessage) => void,
    private onUsageUpdate?: (usage: any) => void,
  ) {}

  /**
   * 解析单个 SSE 事件
   */
  parseEvent(event: any): void {
    switch (event.type) {
      case 'response.output_item.added': {
        this.handleOutputItemAdded(event)
        break
      }
      case 'response.content_part.added': {
        this.handleContentPartAdded(event)
        break
      }
      case 'response.output_text.delta': {
        this.handleOutputTextDelta(event)
        break
      }
      case 'response.output_text.done': {
        this.handleOutputTextDone(event)
        break
      }
      case 'response.content_part.done': {
        this.handleContentPartDone(event)
        break
      }
      case 'response.output_item.done': {
        this.handleOutputItemDone(event)
        break
      }
      case 'response.completed': {
        this.handleResponseCompleted(event)
        break
      }
      default: {
        // 忽略其他事件类型
        break
      }
    }
  }

  private handleOutputItemAdded(_event: any): void {
    // 开始新的消息
    this.sentAt = Date.now()
    this.currentMessage = createUIMessage('assistant', '', {
      metadata: {
        sentAt: this.sentAt,
      },
    })
    this.textAccumulator = ''
  }

  private handleContentPartAdded(event: any): void {
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

  private handleOutputTextDelta(event: any): void {
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

  private handleOutputTextDone(event: any): void {
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

  private handleContentPartDone(event: any): void {
    // 内容部分完成
    if (this.currentMessage && event.part?.type === 'output_text') {
      this.currentMessage = updateMessageContent(
        this.currentMessage,
        event.part.text || this.textAccumulator,
      )
      this.onMessageUpdate(this.currentMessage)
    }
  }

  private handleOutputItemDone(_event: any): void {
    if (!this.currentMessage) {
      return
    }

    // 添加接收时间到metadata
    this.currentMessage = {
      ...this.currentMessage,
      metadata: {
        ...this.currentMessage.metadata,
        receivedAt: Date.now(),
      },
    }

    // 消息完成
    this.onMessageComplete(this.currentMessage)
  }

  private handleResponseCompleted(event: any): void {
    // 处理使用统计
    if (event.response?.usage && this.onUsageUpdate) {
      this.onUsageUpdate(event.response.usage)
    }
  }

  /**
   * 重置解析器状态
   */
  reset(): void {
    this.currentMessage = null
    this.textAccumulator = ''
    this.sentAt = 0
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
    catch (error) {
      console.warn('Failed to parse SSE data:', error)
      return null
    }
  }
  return null
}

/**
 * 创建 Responses API 解析器的便捷函数
 */
export function createResponsesApiParser(
  onMessageUpdate: (message: ChatMessage) => void,
  onMessageComplete: (message: ChatMessage) => void,
  onUsageUpdate?: (usage: any) => void,
): ResponsesApiParser {
  return new ResponsesApiParser(onMessageUpdate, onMessageComplete, onUsageUpdate)
}
