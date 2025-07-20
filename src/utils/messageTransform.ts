import type { ChatCompletionContentPart, ChatCompletionMessageParam } from 'openai/resources/chat/completions/completions.js'
import type { ResponseInput } from 'openai/resources/responses/responses.js'
import type {
  ChatMessage,
  MessageContent,
  TransformOptions,
} from '../types/message'

/**
 * 生成消息 ID
 */
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * 创建新的 UI Message
 */
export function createUIMessage(
  role: ChatMessage['role'],
  content: MessageContent,
  options?: {
    id?: string
    timestamp?: number
    reasoning?: string
    metadata?: ChatMessage['metadata']
  },
): ChatMessage {
  return {
    id: options?.id || generateMessageId(),
    role,
    content,
    timestamp: options?.timestamp || Date.now(),
    reasoning: options?.reasoning,
    metadata: options?.metadata,
  }
}

/**
 * 验证消息内容是否为有效格式
 */
export function isValidMessageContent(content: any): content is MessageContent {
  if (typeof content === 'string') {
    return true
  }

  if (Array.isArray(content)) {
    return content.every(item =>
      (item.type === 'text' && typeof item.text === 'string')
      || (item.type === 'image_url' && typeof item.image_url?.url === 'string'),
    )
  }

  return false
}

/**
 * 预处理消息列表 - 过滤错误消息
 */
function preprocessMessages(messages: ChatMessage[]): ChatMessage[] {
  // 过滤错误消息
  return messages.filter(msg => msg.role !== 'error')
}

// Helper to convert MessageContent to ChatCompletionMessageParam content
function convertContent(content: MessageContent): string | ChatCompletionContentPart[] {
  if (typeof content === 'string') {
    return content
  }
  if (Array.isArray(content)) {
    // Map each part to the OpenAI API format
    const convertedContent = content
      .map((item) => {
        if (item.type === 'text') {
          return {
            type: 'text',
            text: item.text,
          } as ChatCompletionContentPart
        }
        if (item.type === 'image_url') {
          return {
            type: 'image_url',
            image_url: { url: item.image_url?.url },
          } as ChatCompletionContentPart
        }
        // function_call 和 tool_call 在 ChatCompletions API 中不作为 content 处理
        // 这些会在消息级别处理
        if (item.type === 'function_call' || item.type === 'tool_call') {
          return null
        }
        return null
      })
      .filter((item): item is ChatCompletionContentPart => item !== null)

    return convertedContent.length > 0 ? convertedContent : [{ type: 'text', text: '' }]
  }
  return ''
}

/**
 * 将 UI Message 转换为 Chat Completions API 格式
 */
export function transformToChatCompletions(
  messages: ChatMessage[],
): ChatCompletionMessageParam[] {
  const preprocessed = preprocessMessages(messages)

  return preprocessed
    .filter((msg): msg is ChatMessage & { role: Exclude<ChatMessage['role'], 'error'> } => msg.role !== 'error')
    .map((msg) => {
      let result: ChatCompletionMessageParam

      switch (msg.role) {
        case 'user': {
          result = {
            role: 'user',
            content: convertContent(msg.content),
          }

          break
        }
        case 'assistant': {
          const content = convertContent(msg.content)

          // Assistant 消息的内容处理
          if (typeof content === 'string') {
            result = {
              role: 'assistant',
              content,
            }
          }
          else {
            // 对于数组内容，assistant 消息只能包含文本内容
            const textContent = content
              .filter(item => item.type === 'text')
              .map(item => item.text)
              .join('')
            result = {
              role: 'assistant',
              content: textContent || '',
            }
          }

          break
        }
        case 'system': {
          const content = convertContent(msg.content)

          // System 消息只能包含文本内容
          if (typeof content === 'string') {
            result = {
              role: 'system',
              content,
            }
          }
          else {
            // 对于数组内容，system 消息只能包含文本内容
            const textContent = content
              .filter(item => item.type === 'text')
              .map(item => item.text)
              .join('')
            result = {
              role: 'system',
              content: textContent || '',
            }
          }

          break
        }
        default: {
          throw new Error(`Unsupported role: ${msg.role}`)
        }
      }

      // Chat Completions API 不支持 reasoning，需要移除
      // reasoning 会在流式响应中单独处理

      return result
    })
}

/**
 * 将 UI Message 转换为 Responses API 格式
 */
export function transformToResponsesAPI(
  messages: ChatMessage[],
): ResponseInput {
  const preprocessed = preprocessMessages(messages)

  return preprocessed.map((msg) => {
    // 转换内容为 ResponseInputMessageContentList 格式
    const content = convertContentToResponseInput(msg.content, msg.role)

    return {
      role: msg.role as 'user' | 'assistant' | 'system' | 'developer',
      content,
      type: 'message' as const,
    }
  })
}

/**
 * 将 MessageContent 转换为 ResponseInputMessageContentList 格式
 */
function convertContentToResponseInput(content: MessageContent, role: ChatMessage['role']): Array<any> {
  // 根据角色确定文本类型：assistant 使用 output_text，其他使用 input_text
  const textType = role === 'assistant' ? 'output_text' : 'input_text'

  if (typeof content === 'string') {
    return [{
      type: textType,
      text: content,
    }]
  }

  if (Array.isArray(content)) {
    return content.map((item) => {
      if (item.type === 'text') {
        return {
          type: textType,
          text: item.text,
        }
      }
      if (item.type === 'image_url') {
        return {
          type: 'input_image',
          image_url: item.image_url?.url,
          detail: 'auto' as const,
        }
      }
      // function_call 和 tool_call 在 Responses API 中可能需要特殊处理
      // 这里暂时转换为文本描述
      if (item.type === 'function_call') {
        return {
          type: textType,
          text: `Function call: ${item.function_call.name}(${item.function_call.arguments})`,
        }
      }
      if (item.type === 'tool_call') {
        return {
          type: textType,
          text: `Tool call: ${item.tool_call.id} - ${item.tool_call.type}`,
        }
      }
      return null
    }).filter(item => item !== null)
  }

  return [{
    type: textType,
    text: '',
  }]
}
/**
 * 通用的消息转换器
 */
export function transformMessages(
  messages: ChatMessage[],
  options: TransformOptions,
): ChatCompletionMessageParam[] | ResponseInput | any {
  // 如果提供了自定义转换器，使用它
  if (options.customTransformer) {
    return options.customTransformer(messages, options)
  }

  switch (options.apiType) {
    case 'completion': {
      return transformToChatCompletions(messages)
    }
    case 'responses': {
      return transformToResponsesAPI(messages)
    }
    case 'custom': {
      throw new Error('Custom API type requires a customTransformer')
    }
    default: {
      throw new Error(`Unsupported API type: ${options.apiType}`)
    }
  }
}

/**
 * 批量创建消息的辅助函数
 */
export function createMessagesFromConversation(
  conversation: Array<{
    role: ChatMessage['role']
    content: MessageContent
    reasoning?: string
    metadata?: ChatMessage['metadata']
  }>,
): ChatMessage[] {
  return conversation.map(msg => createUIMessage(
    msg.role,
    msg.content,
    {
      reasoning: msg.reasoning,
      metadata: msg.metadata,
    },
  ))
}

/**
 * 更新消息内容的辅助函数
 */
export function updateMessageContent(
  message: ChatMessage,
  content: MessageContent,
  options?: {
    appendMode?: boolean // 是否追加模式（用于流式响应）
    updateTimestamp?: boolean
  },
): ChatMessage {
  const updated = { ...message }

  updated.content = (options?.appendMode && typeof updated.content === 'string' && typeof content === 'string')
    ? updated.content + content
    : content

  if (options?.updateTimestamp) {
    updated.timestamp = Date.now()
  }

  return updated
}

/**
 * 更新消息 reasoning 的辅助函数（仅用于 assistant 消息）
 */
export function updateMessageReasoning(
  message: ChatMessage,
  reasoning: string,
  appendMode: boolean = true,
): ChatMessage {
  if (message.role !== 'assistant') {
    console.warn('Reasoning can only be updated for assistant messages')
    return message
  }

  const updated = { ...message }

  updated.reasoning = (appendMode && updated.reasoning)
    ? updated.reasoning + reasoning
    : reasoning

  return updated
}

/**
 * 将 MessageContent 转换为纯文本字符串 (仅用于需要文本的地方，如 UserChatMessage)
 */
export function messageContentToString(content: MessageContent): string {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (item.type === 'text') {
          return item.text
        }
        if (item.type === 'image_url') {
          return `[图片: ${item.image_url?.url}]`
        }
        if (item.type === 'function_call') {
          return `[函数调用: ${item.function_call.name}]`
        }
        if (item.type === 'tool_call') {
          return `[工具调用: ${item.tool_call.id}]`
        }
        return ''
      })
      .filter(text => text.length > 0)
      .join(' ')
  }

  return ''
}
