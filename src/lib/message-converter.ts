import type { ModelMessage, UIMessage } from 'ai'
import type { ChatMessage, ImageContent, MessageContent, TextContent } from '../types/message'
import { generateId } from '../utils'

/**
 * 将 ChatMessage 转换为 AI SDK 的 UIMessage
 */
export function chatMessageToUIMessage(chatMessage: ChatMessage): UIMessage {
  let content: string | Array<{ type: 'text', text: string } | { type: 'image', image: string }> = ''

  if (typeof chatMessage.content === 'string') {
    content = chatMessage.content
  }
  else if (Array.isArray(chatMessage.content)) {
    const contentArray: Array<{ type: 'text', text: string } | { type: 'image', image: string }> = []

    for (const item of chatMessage.content) {
      switch (item.type) {
        case 'text': {
          if (item.text.trim()) {
            contentArray.push({
              type: 'text',
              text: item.text,
            })
          }
          break
        }
        case 'image_url': {
          contentArray.push({
            type: 'image',
            image: item.image_url.url,
          })
          break
        }
      }
    }
    content = contentArray
  }

  // UIMessage 在 v5 中使用 parts 数组
  const parts: any[] = []

  if (typeof content === 'string') {
    if (content.trim()) {
      parts.push({
        type: 'text',
        text: content,
      })
    }
  }
  else if (Array.isArray(content)) {
    parts.push(...content)
  }

  return {
    id: chatMessage.id,
    role: chatMessage.role === 'error' ? 'assistant' : (chatMessage.role as 'user' | 'assistant' | 'system'),
    parts,
  }
}

/**
 * 将 AI SDK 的 UIMessage 转换为 ChatMessage
 */
export function uiMessageToChatMessage(uiMessage: UIMessage): ChatMessage {
  let content: MessageContent = ''

  // UIMessage v5 使用 parts 数组
  if (uiMessage.parts && uiMessage.parts.length > 0) {
    if (uiMessage.parts.length === 1 && uiMessage.parts[0].type === 'text') {
      content = (uiMessage.parts[0] as any).text
    }
    else {
      const contentArray: Array<TextContent | ImageContent> = []

      for (const part of uiMessage.parts) {
        switch ((part as any).type) {
          case 'text': {
            contentArray.push({
              type: 'text',
              text: (part as any).text,
            })
            break
          }
          case 'image': {
            contentArray.push({
              type: 'image_url',
              image_url: {
                url: (part as any).image || (part as any).url,
              },
            })
            break
          }
          default: {
            // 忽略未知类型
            break
          }
        }
      }
      content = contentArray
    }
  }

  return {
    id: uiMessage.id,
    role: uiMessage.role as ChatMessage['role'],
    content,
    timestamp: Date.now(),
  }
}

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
