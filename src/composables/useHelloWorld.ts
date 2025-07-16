import type { ChatMessage } from '../types/message'

export type { ImageContent, MessageContent, TextContent } from '../types/message'

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
