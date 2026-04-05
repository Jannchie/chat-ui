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

// Responses API input message format (as an array)
export type ResponseInput = Array<{
  role: 'user' | 'assistant' | 'system' | 'developer'
  content: Array<{
    type: 'input_text' | 'output_text' | 'input_image'
    text?: string
    image_url?: { url: string }
    detail?: 'auto'
  }>
  type: 'message'
}>

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
  // Some providers include usage in stream chunks
  usage?: Partial<ResponseUsage> & { cost?: number }
}

// Responses API streaming event types (subset used by our parser/tests)
export interface ResponseCreatedEvent {
  type: 'response.created'
  response?: { model?: string }
  sequence_number?: number
}

export interface ResponseOutputItemAddedEvent {
  type: 'response.output_item.added'
  item: { id: string, type: 'message' | string }
  output_index: number
  sequence_number?: number
}

export interface ResponseContentPartAddedEvent {
  type: 'response.content_part.added'
  part: { type: 'output_text', text?: string }
  index?: number
  item_id?: string
  output_index: number
  sequence_number?: number
}

export interface ResponseTextDeltaEvent {
  type: 'response.output_text.delta'
  delta: string
  content_index: number
  item_id: string
  output_index: number
  sequence_number?: number
}

export interface ResponseTextDoneEvent {
  type: 'response.output_text.done'
  text: string
  content_index: number
  item_id: string
  output_index: number
  sequence_number?: number
}

export interface ResponseContentPartDoneEvent {
  type: 'response.content_part.done'
  part: { type: 'output_text', text?: string }
  index?: number
  item_id?: string
  output_index: number
  sequence_number?: number
}

export interface ResponseOutputItemDoneEvent {
  type: 'response.output_item.done'
  item?: { id?: string, type?: string }
  output_index?: number
  sequence_number?: number
}

export interface ResponseCompletedEvent {
  type: 'response.completed'
  response?: { usage?: ResponseUsage }
  sequence_number?: number
}

export type ResponseStreamEvent
  = | ResponseCreatedEvent
  | ResponseOutputItemAddedEvent
  | ResponseContentPartAddedEvent
  | ResponseTextDeltaEvent
  | ResponseTextDoneEvent
  | ResponseContentPartDoneEvent
  | ResponseOutputItemDoneEvent
  | ResponseCompletedEvent

export interface ResponseUsage {
  input_tokens: number
  output_tokens: number
  total_tokens: number
}
