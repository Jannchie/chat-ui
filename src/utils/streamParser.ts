import type {
  ChatCompletionChunk,
  ResponseCompletedEvent,
  ResponseContentPartAddedEvent,
  ResponseContentPartDoneEvent,
  ResponseCreatedEvent,
  ResponseOutputItemAddedEvent,
  ResponseOutputItemDoneEvent,
  ResponseStreamEvent,
  ResponseTextDeltaEvent,
  ResponseTextDoneEvent,
  StreamCallbacks,
  StreamParser,
  StreamState,
} from '../types/stream'
import { createUIMessage, updateMessageContent } from './messageTransform'

export class UnifiedStreamParser implements StreamParser {
  private state: StreamState = {
    currentMessage: null,
    textContent: '',
    sentAt: 0,
    model: undefined,
    usage: undefined,
    firstTokenAt: undefined,
    lastTokenAt: undefined,
  }

  constructor(private callbacks: StreamCallbacks) {}

  setSentTime(sentAt: number): void {
    this.state.sentAt = sentAt
  }

  parseEvent(event: ResponseStreamEvent | ChatCompletionChunk): void {
    if (this.isResponseStreamEvent(event)) {
      this.handleResponseEvent(event)
    }
    else {
      this.handleChatCompletionChunk(event)
    }
  }

  reset(): void {
    this.state = {
      currentMessage: null,
      textContent: '',
      sentAt: 0,
      model: undefined,
      usage: undefined,
      firstTokenAt: undefined,
      lastTokenAt: undefined,
    }
  }

  private isResponseStreamEvent(event: any): event is ResponseStreamEvent {
    return event.type && event.type.startsWith('response.')
  }

  private handleResponseEvent(event: ResponseStreamEvent): void {
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
        this.handleTextDelta(event as ResponseTextDeltaEvent)
        break
      }
      case 'response.output_text.done': {
        this.handleTextDone(event as ResponseTextDoneEvent)
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
        // 忽略未知事件类型
        break
      }
    }
  }

  private handleChatCompletionChunk(chunk: ChatCompletionChunk): void {
    if (!this.state.currentMessage) {
      this.initializeMessage(chunk.model)
    }

    const delta = chunk.choices[0]?.delta
    if (delta?.content) {
      this.recordTokenTime()
      this.state.textContent += delta.content
      this.updateCurrentMessage()
    }

    // 处理 usage 信息
    if (chunk.usage) {
      this.state.usage = this.normalizeUsage(chunk.usage)
      if (this.state.usage) {
        this.callbacks.onUsageUpdate?.(this.state.usage)
      }
    }

    if (chunk.choices[0]?.finish_reason) {
      this.finalizeMessage()
    }
  }

  private handleResponseCreated(event: ResponseCreatedEvent): void {
    if (event.response?.model) {
      this.state.model = event.response.model
    }
  }

  private handleOutputItemAdded(_event: ResponseOutputItemAddedEvent): void {
    this.initializeMessage(this.state.model)
  }

  private handleContentPartAdded(event: ResponseContentPartAddedEvent): void {
    // 内容部分添加时可能包含初始文本
    if (event.part?.type === 'output_text' && event.part.text) {
      this.state.textContent = event.part.text
      this.updateCurrentMessage()
    }
  }

  private handleTextDelta(event: ResponseTextDeltaEvent): void {
    if (event.delta) {
      this.recordTokenTime()
      this.state.textContent += event.delta
      this.updateCurrentMessage()
    }
  }

  private handleTextDone(event: ResponseTextDoneEvent): void {
    if (event.text) {
      this.state.textContent = event.text
      this.updateCurrentMessage()
    }
  }

  private handleContentPartDone(event: ResponseContentPartDoneEvent): void {
    if (event.part?.type === 'output_text' && event.part.text) {
      this.state.textContent = event.part.text
      this.updateCurrentMessage()
    }
  }

  private handleOutputItemDone(_event: ResponseOutputItemDoneEvent): void {
    this.finalizeMessage()
  }

  private handleResponseCompleted(event: ResponseCompletedEvent): void {
    // 处理 usage 信息
    if (event.response?.usage) {
      this.state.usage = this.normalizeUsage(event.response.usage)

      // 计算 token 速度
      let tokenSpeed: number | undefined
      if (this.state.usage && this.state.firstTokenAt && this.state.lastTokenAt) {
        const outputTokens = this.state.usage.output_tokens
        if (outputTokens && outputTokens > 0) {
          const duration = (this.state.lastTokenAt - this.state.firstTokenAt) / 1000 // 转换为秒
          if (duration > 0) {
            tokenSpeed = outputTokens / duration
          }
        }
      }

      // 更新当前消息的 usage 信息和 token 速度
      if (this.state.currentMessage) {
        this.state.currentMessage = {
          ...this.state.currentMessage,
          metadata: {
            ...this.state.currentMessage.metadata,
            firstTokenAt: this.state.firstTokenAt,
            usage: this.state.usage,
            tokenSpeed,
          },
        }
        this.callbacks.onMessageUpdate(this.state.currentMessage)
      }

      if (this.state.usage) {
        this.callbacks.onUsageUpdate?.(this.state.usage)
      }
    }
  }

  private initializeMessage(model?: string): void {
    // 如果没有预设的 sentAt 时间，使用当前时间
    if (this.state.sentAt === 0) {
      this.state.sentAt = Date.now()
    }
    this.state.currentMessage = createUIMessage('assistant', '', {
      metadata: {
        sentAt: this.state.sentAt,
        model: model || this.state.model,
      },
    })
    this.state.textContent = ''
    this.callbacks.onMessageUpdate(this.state.currentMessage)
  }

  private updateCurrentMessage(): void {
    if (!this.state.currentMessage) {
      return
    }

    this.state.currentMessage = updateMessageContent(
      this.state.currentMessage,
      this.state.textContent,
    )
    this.callbacks.onMessageUpdate(this.state.currentMessage)
  }

  private recordTokenTime(): void {
    const now = Date.now()
    if (!this.state.firstTokenAt) {
      this.state.firstTokenAt = now
      // 记录第一个 token 时间到消息 metadata 中
      if (this.state.currentMessage) {
        this.state.currentMessage = {
          ...this.state.currentMessage,
          metadata: {
            ...this.state.currentMessage.metadata,
            firstTokenAt: now,
          },
        }
      }
    }
    this.state.lastTokenAt = now
  }

  private finalizeMessage(): void {
    if (!this.state.currentMessage) {
      return
    }

    // 计算 token 速度
    let tokenSpeed: number | undefined
    if (this.state.usage && this.state.firstTokenAt && this.state.lastTokenAt) {
      const outputTokens = this.state.usage.output_tokens
      if (outputTokens && outputTokens > 0) {
        const duration = (this.state.lastTokenAt - this.state.firstTokenAt) / 1000 // 转换为秒
        if (duration > 0) {
          tokenSpeed = outputTokens / duration
        }
      }
    }

    // 添加接收时间和最终的 usage 信息
    this.state.currentMessage = {
      ...this.state.currentMessage,
      metadata: {
        ...this.state.currentMessage.metadata,
        firstTokenAt: this.state.firstTokenAt,
        receivedAt: Date.now(),
        usage: this.state.usage,
        tokenSpeed,
      },
    }

    this.callbacks.onMessageComplete(this.state.currentMessage)
  }

  private normalizeUsage(usage: any): any {
    // 标准化不同 API 的 usage 格式，统一转换成 input_tokens 和 output_tokens 形式
    const inputTokens = usage.input_tokens || usage.prompt_tokens || 0
    const outputTokens = usage.output_tokens || usage.completion_tokens || 0
    const totalTokens = usage.total_tokens || inputTokens + outputTokens

    return {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
    }
  }
}

export function createUnifiedStreamParser(callbacks: StreamCallbacks): StreamParser {
  return new UnifiedStreamParser(callbacks)
}

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
