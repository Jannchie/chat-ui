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
  ResponseUsage,
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
  }

  constructor(private callbacks: StreamCallbacks) {}

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
      this.state.textContent += delta.content
      this.updateCurrentMessage()
    }

    if (chunk.choices[0]?.finish_reason) {
      this.finalizeMessage()
    }

    // 处理 usage 信息
    if (chunk.usage) {
      this.state.usage = this.normalizeUsage(chunk.usage)
      this.callbacks.onUsageUpdate?.(this.state.usage)
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

      // 更新当前消息的 usage 信息
      if (this.state.currentMessage) {
        this.state.currentMessage = {
          ...this.state.currentMessage,
          metadata: {
            ...this.state.currentMessage.metadata,
            usage: this.state.usage,
          },
        }
        this.callbacks.onMessageUpdate(this.state.currentMessage)
      }

      this.callbacks.onUsageUpdate?.(this.state.usage)
    }
  }

  private initializeMessage(model?: string): void {
    this.state.sentAt = Date.now()
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

  private finalizeMessage(): void {
    if (!this.state.currentMessage) {
      return
    }

    // 添加接收时间和最终的 usage 信息
    this.state.currentMessage = {
      ...this.state.currentMessage,
      metadata: {
        ...this.state.currentMessage.metadata,
        receivedAt: Date.now(),
        usage: this.state.usage,
      },
    }

    this.callbacks.onMessageComplete(this.state.currentMessage)
  }

  private normalizeUsage(usage: any): ResponseUsage {
    // 标准化不同 API 的 usage 格式
    return {
      input_tokens: usage.input_tokens || usage.prompt_tokens || 0,
      output_tokens: usage.output_tokens || usage.completion_tokens || 0,
      total_tokens: usage.total_tokens
        || (usage.input_tokens || usage.prompt_tokens || 0)
        + (usage.output_tokens || usage.completion_tokens || 0),
    } as ResponseUsage
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
