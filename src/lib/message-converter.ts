import type { ModelMessage } from 'ai'
import type {
  AssistantMessageVersion,
  ChatMessage,
  ChatMessageMetadata,
  MessageContent,
} from '../types/message'
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
export interface AssistantVersionInit {
  content: MessageContent
  reasoning?: string
  metadata?: ChatMessageMetadata
}

export function createChatMessage(
  role: ChatMessage['role'],
  content: MessageContent,
  metadata?: ChatMessageMetadata,
  options?: {
    reasoning?: string
    versions?: AssistantMessageVersion[]
    activeVersionIndex?: number
  },
): ChatMessage {
  const timestamp = Date.now()
  const message: ChatMessage = {
    id: generateId(),
    role,
    content,
    timestamp,
    reasoning: options?.reasoning,
    metadata,
    versions: options?.versions,
    activeVersionIndex: options?.activeVersionIndex,
  }

  if (role === 'assistant') {
    return ensureAssistantMessageStructure(message)
  }

  return message
}

/**
 * 更新 ChatMessage 的内容
 */
export function updateChatMessageContent(
  message: ChatMessage,
  content: MessageContent,
): ChatMessage {
  if (message.role === 'assistant') {
    const normalized = ensureAssistantMessageStructure(message)
    const versions = [...(normalized.versions ?? [])]
    const index = normalized.activeVersionIndex ?? 0
    const currentVersion = {
      ...versions[index],
      content,
    }
    versions[index] = currentVersion
    return {
      ...normalized,
      content,
      versions,
    }
  }

  return {
    ...message,
    content,
  }
}

export function updateChatMessageReasoning(
  message: ChatMessage,
  reasoning?: string,
): ChatMessage {
  if (message.role === 'assistant') {
    const normalized = ensureAssistantMessageStructure(message)
    const versions = [...(normalized.versions ?? [])]
    const index = normalized.activeVersionIndex ?? 0
    const currentVersion = {
      ...versions[index],
      reasoning,
    }
    versions[index] = currentVersion
    return {
      ...normalized,
      reasoning,
      versions,
    }
  }

  return {
    ...message,
    reasoning,
  }
}

export function mergeChatMessageMetadata(
  message: ChatMessage,
  partialMetadata: Partial<ChatMessageMetadata>,
): ChatMessage {
  const metadata: ChatMessageMetadata = {
    ...message.metadata,
    ...partialMetadata,
  }

  if (message.role === 'assistant') {
    const normalized = ensureAssistantMessageStructure(message)
    const versions = [...(normalized.versions ?? [])]
    const index = normalized.activeVersionIndex ?? 0
    const currentVersion = {
      ...versions[index],
      metadata,
    }
    versions[index] = currentVersion
    return {
      ...normalized,
      metadata,
      versions,
    }
  }

  return {
    ...message,
    metadata,
  }
}

export function ensureAssistantMessageStructure(message: ChatMessage): ChatMessage {
  if (message.role !== 'assistant') {
    return message
  }

  const existingVersions = message.versions ? [...message.versions] : []
  let activeIndex = message.activeVersionIndex ?? -1

  if (existingVersions.length === 0) {
    const version: AssistantMessageVersion = {
      id: generateId(),
      content: message.content,
      reasoning: message.reasoning,
      metadata: message.metadata,
      createdAt: message.timestamp,
    }
    existingVersions.push(version)
    activeIndex = 0
  }
  else if (activeIndex < 0 || activeIndex >= existingVersions.length) {
    activeIndex = existingVersions.length - 1
  }

  const activeVersion = existingVersions[activeIndex]

  return {
    ...message,
    versions: existingVersions,
    activeVersionIndex: activeIndex,
    content: activeVersion.content,
    reasoning: activeVersion.reasoning,
    metadata: activeVersion.metadata,
  }
}

export function addAssistantMessageVersion(
  message: ChatMessage,
  init: AssistantVersionInit,
): ChatMessage {
  if (message.role !== 'assistant') {
    return message
  }

  const normalized = ensureAssistantMessageStructure(message)
  const versions = [...(normalized.versions ?? [])]
  const metadata = init.metadata ?? {}

  const version: AssistantMessageVersion = {
    id: generateId(),
    content: init.content,
    reasoning: init.reasoning,
    metadata,
    createdAt: Date.now(),
  }

  versions.push(version)
  const activeIndex = versions.length - 1

  return {
    ...normalized,
    content: init.content,
    reasoning: init.reasoning,
    metadata,
    versions,
    activeVersionIndex: activeIndex,
  }
}

export function setAssistantMessageActiveVersion(
  message: ChatMessage,
  index: number,
): ChatMessage {
  if (message.role !== 'assistant') {
    return message
  }
  const normalized = ensureAssistantMessageStructure(message)
  if (!normalized.versions || normalized.versions.length === 0) {
    return normalized
  }
  const clampedIndex = Math.min(Math.max(index, 0), normalized.versions.length - 1)
  const activeVersion = normalized.versions[clampedIndex]
  return {
    ...normalized,
    content: activeVersion.content,
    reasoning: activeVersion.reasoning,
    metadata: activeVersion.metadata,
    activeVersionIndex: clampedIndex,
  }
}

export function normalizeChatMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.map(message => ensureAssistantMessageStructure(message))
}
