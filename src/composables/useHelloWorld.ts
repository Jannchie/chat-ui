export interface ImageContent {
  type: 'image_url'
  image_url: {
    url: string
  }
}

export interface TextContent {
  type: 'text'
  text: string
}

export type MessageContent = string | Array<TextContent | ImageContent>

export type SentableChatMessage = {
  content: MessageContent
  role: 'user'
} | {
  content: string
  role: 'assistant'
  reasoning?: string
  model?: string
} | {
  content: string
  role: 'system'
}
export type ChatMessage = SentableChatMessage | {
  role: 'error'
  content: string
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
