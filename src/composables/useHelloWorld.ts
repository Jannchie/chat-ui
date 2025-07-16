import type { ChatMessage, MessageContent } from '../types/message'

// 向后兼容的类型别名
export type { ImageContent, MessageContent, TextContent } from '../types/message'

// 保持向后兼容的类型
export type SentableChatMessage = {
  content: MessageContent
  role: 'user'
  timestamp?: number
} | {
  content: string
  role: 'assistant'
  reasoning?: string
  model?: string
  timestamp?: number
} | {
  content: string
  role: 'system'
  timestamp?: number
}

export interface ImageFile {
  file: File
  dataUrl: string
  id: string
}

export interface ChatData {
  id: string
  title: string | null
  token: {
    inTokens: number
    outTokens: number
  }
  conversation: ChatMessage[]
}
