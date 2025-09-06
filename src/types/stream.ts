import type { ChatMessage } from './message'
import type { ChatCompletionChunk, ResponseStreamEvent, ResponseUsage } from './openai-compat'

// Re-export event types for convenience
export type {
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
} from './openai-compat'

export interface StreamCallbacks {
  onMessageUpdate: (message: ChatMessage) => void
  onMessageComplete: (message: ChatMessage) => void
  onUsageUpdate?: (usage: ResponseUsage) => void
}

export interface StreamParser {
  parseEvent: (event: ResponseStreamEvent | ChatCompletionChunk) => void
  reset: () => void
  setSentTime: (sentAt: number) => void
}

export interface StreamState {
  currentMessage: ChatMessage | null
  textContent: string
  reasoningContent: string
  sentAt: number
  model?: string
  usage?: ResponseUsage
  cost?: number
  firstTokenAt?: number
  lastTokenAt?: number
}
