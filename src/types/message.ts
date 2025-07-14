import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { ResponseInput } from 'openai/resources/responses/responses'

// Message content types
export type MessageContent = string | Array<TextContent | ImageContent | FunctionCallContent | ToolCallContent>

export interface TextContent {
  type: 'text'
  text: string
}

export interface ImageContent {
  type: 'image_url'
  image_url: {
    url: string
  }
}

export interface FunctionCallContent {
  type: 'function_call'
  function_call: {
    name: string
    arguments: string
  }
}

export interface ToolCallContent {
  type: 'tool_call'
  tool_call: {
    id: string
    type: 'function' | 'mcp'
    function?: {
      name: string
      arguments: string
    }
    mcp?: {
      server: string
      tool: string
      arguments: string
    }
  }
}

// UI Message - 包含完整的前端需要的信息
export interface UIMessage {
  role: 'user' | 'assistant' | 'system' | 'error'
  content: MessageContent
  id: string
  timestamp: number // 消息的时间戳
  reasoning?: string // 仅用于 assistant 消息
  metadata?: {
    sentAt?: number // 用户发送消息的时间
    receivedAt?: number // 收到 AI 响应的时间
    edited?: boolean // 是否被编辑过
    retryCount?: number // 重试次数
    model?: string // 使用的模型
  }
}

// Transform 参数类型
export interface TransformOptions {
  apiType: 'completion' | 'responses' | 'custom'
  includeSystemMessages?: boolean
  includeTimestamps?: boolean
  maxMessages?: number
  filterErrors?: boolean // 是否过滤错误消息
  preserveReasoning?: boolean // 是否保留 reasoning 字段
  customTransformer?: MessageTransformer // 自定义转换器
}

// API Message 联合类型
export type APIMessage = ChatCompletionMessageParam | ResponseInput

// Transform 函数类型
export type MessageTransformer<T = any> = (
  messages: UIMessage[],
  options: TransformOptions
) => T
