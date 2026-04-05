import type { ChatData } from '../composables/chat-types'
import type {
  AssistantMessageVersion,
  ChatMessage,
  ChatMessageMetadata,
  MessageContent,
} from '../types/message'

interface ExportedTokenUsage {
  input_tokens: number
  output_tokens: number
  total_tokens: number
}

interface ExportedChatMessageMetadata {
  sentAt?: number
  edited?: boolean
  model?: string
  preset?: string
  firstTokenAt?: number
  receivedAt?: number
  tokenSpeed?: number
  usage?: ExportedTokenUsage
  cost?: number
}

interface ExportedAssistantMessageVersion {
  id: string
  content: MessageContent
  reasoning?: string
  metadata?: ExportedChatMessageMetadata
  createdAt: number
}

interface ExportedChatMessage {
  id: string
  role: ChatMessage['role']
  content: MessageContent
  timestamp: number
  reasoning?: string
  metadata?: ExportedChatMessageMetadata
  versions?: ExportedAssistantMessageVersion[]
  activeVersionIndex?: number
}

export interface ExportedChatData {
  id: string
  title: string | null
  conversation: ExportedChatMessage[]
  token: {
    inTokens: number
    outTokens: number
  }
}

function serializeUsage(
  usage: ChatMessageMetadata['usage'],
): ExportedTokenUsage | undefined {
  if (!usage) {
    return undefined
  }

  return {
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    total_tokens: usage.total_tokens,
  }
}

function serializeMetadata(
  metadata?: ChatMessageMetadata,
): ExportedChatMessageMetadata | undefined {
  if (!metadata) {
    return undefined
  }

  const serialized: ExportedChatMessageMetadata = {}

  if (metadata.sentAt !== undefined) {
    serialized.sentAt = metadata.sentAt
  }
  if (metadata.edited !== undefined) {
    serialized.edited = metadata.edited
  }
  if (metadata.model !== undefined) {
    serialized.model = metadata.model
  }
  if (metadata.preset !== undefined) {
    serialized.preset = metadata.preset
  }
  if (metadata.firstTokenAt !== undefined) {
    serialized.firstTokenAt = metadata.firstTokenAt
  }
  if (metadata.receivedAt !== undefined) {
    serialized.receivedAt = metadata.receivedAt
  }
  if (metadata.tokenSpeed !== undefined) {
    serialized.tokenSpeed = metadata.tokenSpeed
  }
  if (metadata.cost !== undefined) {
    serialized.cost = metadata.cost
  }

  const usage = serializeUsage(metadata.usage)
  if (usage) {
    serialized.usage = usage
  }

  return Object.keys(serialized).length > 0 ? serialized : undefined
}

function serializeVersion(
  version: AssistantMessageVersion,
): ExportedAssistantMessageVersion {
  const serialized: ExportedAssistantMessageVersion = {
    id: version.id,
    content: version.content,
    createdAt: version.createdAt,
  }

  if (version.reasoning !== undefined) {
    serialized.reasoning = version.reasoning
  }

  const metadata = serializeMetadata(version.metadata)
  if (metadata) {
    serialized.metadata = metadata
  }

  return serialized
}

function serializeMessage(message: ChatMessage): ExportedChatMessage {
  const serialized: ExportedChatMessage = {
    id: message.id,
    role: message.role,
    content: message.content,
    timestamp: message.timestamp,
  }

  if (message.reasoning !== undefined) {
    serialized.reasoning = message.reasoning
  }

  const metadata = serializeMetadata(message.metadata)
  if (metadata) {
    serialized.metadata = metadata
  }

  if (message.versions?.length) {
    serialized.versions = message.versions.map(serializeVersion)
  }

  if (message.activeVersionIndex !== undefined) {
    serialized.activeVersionIndex = message.activeVersionIndex
  }

  return serialized
}

export function serializeChatForExport(chat: ChatData): ExportedChatData {
  return {
    id: chat.id,
    title: chat.title,
    conversation: chat.conversation.map(serializeMessage),
    token: {
      inTokens: chat.token.inTokens,
      outTokens: chat.token.outTokens,
    },
  }
}
