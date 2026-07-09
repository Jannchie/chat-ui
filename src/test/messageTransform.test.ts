import type { ChatMessage, MessageContent } from '../types/message'
import { describe, expect, it } from 'vitest'
import {
  chatMessagesToModelMessages,
  createChatMessage,
  isChatMessage,
  normalizeChatMessages,
} from '../lib/message-converter'
import { messageContentToString } from '../utils/messageTransform'

describe('messagetransform', () => {
  describe('message validation', () => {
    it('should detect invalid chat message entries', () => {
      expect(isChatMessage(undefined)).toBe(false)
      expect(isChatMessage({ role: 'user' })).toBe(false)
      expect(
        isChatMessage({
          id: 'msg-1',
          role: 'user',
          content: 'Hello',
          timestamp: Date.now(),
        }),
      ).toBe(true)
    })

    it('should drop invalid conversation items during normalization', () => {
      const messages = [
        createChatMessage('user', 'Hello'),
        undefined,
        createChatMessage('assistant', 'Hi'),
      ] as unknown as ChatMessage[]

      const normalized = normalizeChatMessages(messages)

      expect(normalized).toHaveLength(2)
      expect(normalized[0].role).toBe('user')
      expect(normalized[1].role).toBe('assistant')
    })

    it('should ignore invalid items when converting to model messages', () => {
      const messages = [
        createChatMessage('user', 'Hello'),
        undefined,
        createChatMessage('assistant', 'Hi'),
      ] as unknown as ChatMessage[]

      const converted = chatMessagesToModelMessages(messages)

      expect(converted).toHaveLength(2)
      expect(converted[0].role).toBe('user')
      expect(converted[1].role).toBe('assistant')
    })
  })

  describe('messagecontenttostring', () => {
    it('should convert string content', () => {
      const result = messageContentToString('Hello world')
      expect(result).toBe('Hello world')
    })

    it('should convert complex content to string', () => {
      const content: MessageContent = [
        { type: 'text', text: 'Hello' },
        {
          type: 'image_url',
          image_url: { url: 'http://example.com/image.jpg' },
        },
        {
          type: 'function_call',
          function_call: { name: 'search', arguments: '{}' },
        },
        { type: 'tool_call', tool_call: { id: 'tool-1', type: 'function' } },
      ]

      const result = messageContentToString(content)
      expect(result).toBe(
        'Hello [图片: http://example.com/image.jpg] [函数调用: search] [工具调用: tool-1]',
      )
    })

    it('should filter out empty text parts', () => {
      const content: MessageContent = [
        { type: 'text', text: 'Hello' },
        { type: 'text', text: '' },
        { type: 'text', text: 'World' },
      ]

      const result = messageContentToString(content)
      expect(result).toBe('Hello World')
    })

    it('should return empty string for empty arrays', () => {
      const result = messageContentToString([])
      expect(result).toBe('')
    })
  })
})
