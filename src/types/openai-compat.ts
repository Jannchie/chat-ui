// Compatibility types to replace OpenAI SDK types

export interface ChatCompletionContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: {
    url: string
  }
}

export interface ChatCompletionMessageParam {
  role: 'user' | 'assistant' | 'system'
  content: string | ChatCompletionContentPart[]
}

export interface ResponseInput {
  role: 'user' | 'assistant' | 'system' | 'developer'
  content: Array<{
    type: 'input_text' | 'output_text' | 'input_image'
    text?: string
    image_url?: string
    detail?: 'auto'
  }>
  type: 'message'
}

export interface ChatCompletionChunk {
  id: string
  object: 'chat.completion.chunk'
  created: number
  model: string
  choices: Array<{
    index: number
    delta: {
      role?: 'assistant'
      content?: string
    }
    finish_reason: string | null
  }>
}

export interface ResponseStreamEvent {
  type: 'response.output.part'
  part: {
    type: 'text'
    text: string
  }
}

export interface ResponseUsage {
  input_tokens: number
  output_tokens: number
  total_tokens: number
}