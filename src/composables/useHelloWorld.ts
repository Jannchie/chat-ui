export type SentableChatMessage = {
  content: string
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

export interface ChatData {
  id: string
  title: string | null
  token: {
    inTokens: number
    outTokens: number
  }
  conversation: ChatMessage[]
}
