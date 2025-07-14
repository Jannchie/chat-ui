import type { MessageContent, UIMessage } from '../types/message'

// 向后兼容的类型别名
export type { ImageContent, MessageContent, TextContent } from '../types/message'

// 扩展 UIMessage 以提供向后兼容性
export interface ChatMessage extends UIMessage {
  // 所有必要的字段都已在 UIMessage 中定义
}

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
