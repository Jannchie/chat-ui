import type { ModelMessage } from 'ai'
import type { ChatMessage, MessageContent } from '../types/message'
import { generateId } from '../utils'


/**
 * 将 ChatMessage 数组转换为 AI SDK 的 ModelMessage 数组
 */
export function chatMessagesToModelMessages(chatMessages: ChatMessage[]): ModelMessage[] {
  return chatMessages
    .filter(msg => msg.role !== 'error') // 过滤错误消息
    .map((chatMessage): ModelMessage => {
      const role = chatMessage.role as 'user' | 'assistant' | 'system'
      const content = convertContentToMessageFormat(chatMessage.content)

      if (role === 'system') {
        return {
          role: 'system',
          content: typeof content === 'string' ? content : JSON.stringify(content),
        }
      }
      else if (role === 'user') {
        return {
          role: 'user',
          content: content as any,
        }
      }
      else {
        return {
          role: 'assistant',
          content: content as any,
        }
      }
    })
}

/**
 * 将消息内容转换为 AI SDK 的 Message 内容格式
 */
function convertContentToMessageFormat(content: MessageContent) {
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content.map((item) => {
      switch (item.type) {
        case 'text': {
          return {
            type: 'text' as const,
            text: item.text,
          }
        }
        case 'image_url': {
          return {
            type: 'image' as const,
            image: item.image_url.url,
          }
        }
        default: {
          // 对于未知类型，尝试返回文本
          return {
            type: 'text' as const,
            text: JSON.stringify(item),
          }
        }
      }
    })
  }

  return ''
}

/**
 * 创建一个新的 ChatMessage
 */
export function createChatMessage(
  role: ChatMessage['role'],
  content: MessageContent,
  metadata?: ChatMessage['metadata'],
): ChatMessage {
  return {
    id: generateId(),
    role,
    content,
    timestamp: Date.now(),
    metadata,
  }
}

/**
 * 更新 ChatMessage 的内容
 */
export function updateChatMessageContent(
  message: ChatMessage,
  content: MessageContent,
): ChatMessage {
  return {
    ...message,
    content,
  }
}
