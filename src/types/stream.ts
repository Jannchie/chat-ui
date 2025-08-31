import type { ChatCompletionChunk } from 'openai/resources/chat/completions'
import type { ResponseStreamEvent, ResponseUsage } from 'openai/resources/responses/responses'

import type { ChatMessage } from './message'

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

export type { ChatCompletionChunk } from 'openai/resources/chat/completions'
export type {
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
} from 'openai/resources/responses/responses'
