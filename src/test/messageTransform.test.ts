import type { ChatMessage, MessageContent } from '../types/message'
import { describe, expect, it, vi } from 'vitest'
import {
  createMessagesFromConversation,
  createUIMessage,
  isValidMessageContent,
  messageContentToString,
  transformMessages,
  transformToChatCompletions,
  transformToResponsesAPI,
  updateMessageContent,
  updateMessageReasoning,
} from '../utils/messageTransform'
import { createUnifiedStreamParser } from '../utils/streamParser'

describe('messagetransform', () => {
  describe('createuimessage', () => {
    it('should create a basic ui message with required fields', () => {
      const message = createUIMessage('user', 'Hello world')

      expect(message.role).toBe('user')
      expect(message.content).toBe('Hello world')
      expect(message.id).toMatch(/^msg_\d+_[a-z0-9]{9}$/)
      expect(message.timestamp).toBeTypeOf('number')
      expect(message.reasoning).toBeUndefined()
      expect(message.metadata).toBeUndefined()
    })

    it('should create a message with optional fields', () => {
      const timestamp = Date.now()
      const message = createUIMessage('assistant', 'Response', {
        id: 'custom-id',
        timestamp,
        reasoning: 'My reasoning',
        metadata: { model: 'gpt-4' },
      })

      expect(message.id).toBe('custom-id')
      expect(message.timestamp).toBe(timestamp)
      expect(message.reasoning).toBe('My reasoning')
      expect(message.metadata?.model).toBe('gpt-4')
    })

    it('should handle complex content types', () => {
      const complexContent: MessageContent = [
        { type: 'text', text: 'Hello' },
        { type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } },
      ]

      const message = createUIMessage('user', complexContent)
      expect(message.content).toEqual(complexContent)
    })
  })

  describe('isvalidmessagecontent', () => {
    it('should validate string content', () => {
      expect(isValidMessageContent('Hello')).toBe(true)
      expect(isValidMessageContent('')).toBe(true)
    })

    it('should validate array content with valid items', () => {
      const validContent = [
        { type: 'text', text: 'Hello' },
        { type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } },
      ]
      expect(isValidMessageContent(validContent)).toBe(true)
    })

    it('should reject invalid content types', () => {
      expect(isValidMessageContent(123)).toBe(false)
      expect(isValidMessageContent(null)).toBe(false)
      expect(isValidMessageContent(undefined)).toBe(false)
      expect(isValidMessageContent({})).toBe(false)
    })

    it('should reject arrays with invalid items', () => {
      const invalidContent = [
        { type: 'text', text: 'Hello' },
        { type: 'invalid', data: 'something' },
      ]
      expect(isValidMessageContent(invalidContent)).toBe(false)
    })
  })

  describe('transformtochatcompletions', () => {
    it('should transform simple text messages', () => {
      const messages: ChatMessage[] = [
        createUIMessage('system', 'You are a helpful assistant'),
        createUIMessage('user', 'Hello'),
        createUIMessage('assistant', 'Hi there!'),
      ]

      const result = transformToChatCompletions(messages)

      expect(result).toHaveLength(3)
      expect(result[0]).toEqual({
        role: 'system',
        content: 'You are a helpful assistant',
      })
      expect(result[1]).toEqual({
        role: 'user',
        content: 'Hello',
      })
      expect(result[2]).toEqual({
        role: 'assistant',
        content: 'Hi there!',
      })
    })

    it('should handle user messages with image content', () => {
      const content: MessageContent = [
        { type: 'text', text: 'What is in this image?' },
        { type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } },
      ]
      const messages: ChatMessage[] = [
        createUIMessage('user', content),
      ]

      const result = transformToChatCompletions(messages)

      expect(result).toHaveLength(1)
      expect(result[0].role).toBe('user')
      expect(Array.isArray(result[0].content)).toBe(true)
      const contentArray = result[0].content as any[]
      expect(contentArray).toHaveLength(2)
      expect(contentArray[0]).toEqual({
        type: 'text',
        text: 'What is in this image?',
      })
      expect(contentArray[1]).toEqual({
        type: 'image_url',
        image_url: { url: 'http://example.com/image.jpg' },
      })
    })

    it('should filter out error messages', () => {
      const messages: ChatMessage[] = [
        createUIMessage('user', 'Hello'),
        createUIMessage('error' as any, 'Something went wrong'),
        createUIMessage('assistant', 'Hi there!'),
      ]

      const result = transformToChatCompletions(messages)

      expect(result).toHaveLength(2)
      expect(result[0].role).toBe('user')
      expect(result[1].role).toBe('assistant')
    })

    it('should handle assistant messages with complex content', () => {
      const content: MessageContent = [
        { type: 'text', text: 'Here is the answer:' },
        { type: 'function_call', function_call: { name: 'calculate', arguments: '{"x": 5}' } },
      ]
      const messages: ChatMessage[] = [
        createUIMessage('assistant', content),
      ]

      const result = transformToChatCompletions(messages)

      expect(result).toHaveLength(1)
      expect(result[0].role).toBe('assistant')
      expect(result[0].content).toBe('Here is the answer:')
    })

    it('should handle system messages with complex content', () => {
      const content: MessageContent = [
        { type: 'text', text: 'System prompt' },
        { type: 'text', text: ' additional context' },
      ]
      const messages: ChatMessage[] = [
        createUIMessage('system', content),
      ]

      const result = transformToChatCompletions(messages)

      expect(result).toHaveLength(1)
      expect(result[0].role).toBe('system')
      expect(result[0].content).toBe('System prompt additional context')
    })
  })

  describe('transformtoresponsesapi', () => {
    it('should transform messages to responses api format', () => {
      const messages: ChatMessage[] = [
        createUIMessage('user', 'Hello'),
        createUIMessage('assistant', 'Hi there!'),
      ]

      const result = transformToResponsesAPI(messages)

      expect(result).toHaveLength(2)
      expect(result[0]).toEqual({
        role: 'user',
        content: [{ type: 'input_text', text: 'Hello' }],
        type: 'message',
      })
      expect(result[1]).toEqual({
        role: 'assistant',
        content: [{ type: 'output_text', text: 'Hi there!' }],
        type: 'message',
      })
    })

    it('should handle image content in responses api', () => {
      const content: MessageContent = [
        { type: 'text', text: 'Analyze this image' },
        { type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } },
      ]
      const messages: ChatMessage[] = [
        createUIMessage('user', content),
      ]

      const result = transformToResponsesAPI(messages)

      expect(result).toHaveLength(1)
      // Access content array as any to avoid TypeScript errors
      const messageItem = result[0] as any
      expect(messageItem.content).toHaveLength(2)
      expect(messageItem.content[0]).toEqual({
        type: 'input_text',
        text: 'Analyze this image',
      })
      expect(messageItem.content[1]).toEqual({
        type: 'input_image',
        image_url: { url: 'http://example.com/image.jpg' },
        detail: 'auto',
      })
    })

    it('should handle function calls in responses api', () => {
      const content: MessageContent = [
        { type: 'function_call', function_call: { name: 'search', arguments: '{"query": "test"}' } },
      ]
      const messages: ChatMessage[] = [
        createUIMessage('assistant', content),
      ]

      const result = transformToResponsesAPI(messages)

      expect(result).toHaveLength(1)
      const messageItem = result[0] as any
      expect(messageItem.content).toHaveLength(1)
      expect(messageItem.content[0]).toEqual({
        type: 'output_text',
        text: 'Function call: search({"query": "test"})',
      })
    })

    it('should handle tool calls in responses api', () => {
      const content: MessageContent = [
        {
          type: 'tool_call',
          tool_call: {
            id: 'tool-123',
            type: 'function',
            function: { name: 'calculator', arguments: '{"operation": "add"}' },
          },
        },
      ]
      const messages: ChatMessage[] = [
        createUIMessage('assistant', content),
      ]

      const result = transformToResponsesAPI(messages)

      expect(result).toHaveLength(1)
      const messageItem = result[0] as any
      expect(messageItem.content).toHaveLength(1)
      expect(messageItem.content[0]).toEqual({
        type: 'output_text',
        text: 'Tool call: tool-123 - function',
      })
    })
  })

  describe('transformmessages', () => {
    const messages: ChatMessage[] = [
      createUIMessage('user', 'Hello'),
      createUIMessage('assistant', 'Hi there!'),
    ]

    it('should use chat completions transformer', () => {
      const result = transformMessages(messages, { apiType: 'completion' })
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('role', 'user')
      expect(result[0]).toHaveProperty('content', 'Hello')
    })

    it('should use responses api transformer', () => {
      const result = transformMessages(messages, { apiType: 'responses' })
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toHaveProperty('role', 'user')
      expect(result[0]).toHaveProperty('type', 'message')
    })

    it('should use custom transformer when provided', () => {
      const customTransformer = vi.fn().mockReturnValue(['custom result'])
      const result = transformMessages(messages, {
        apiType: 'custom',
        customTransformer,
      })

      expect(customTransformer).toHaveBeenCalledWith(messages, {
        apiType: 'custom',
        customTransformer,
      })
      expect(result).toEqual(['custom result'])
    })

    it('should throw error for custom api type without transformer', () => {
      expect(() => {
        transformMessages(messages, { apiType: 'custom' })
      }).toThrow('Custom API type requires a customTransformer')
    })

    it('should throw error for unsupported api type', () => {
      expect(() => {
        transformMessages(messages, { apiType: 'unsupported' as any })
      }).toThrow('Unsupported API type: unsupported')
    })
  })

  describe('createmessagesfromconversation', () => {
    it('should create messages from conversation array', () => {
      const conversation = [
        { role: 'user' as const, content: 'Hello' },
        {
          role: 'assistant' as const,
          content: 'Hi there!',
          reasoning: 'Greeting response',
          metadata: { model: 'gpt-4' },
        },
      ]

      const result = createMessagesFromConversation(conversation)

      expect(result).toHaveLength(2)
      expect(result[0].role).toBe('user')
      expect(result[0].content).toBe('Hello')
      expect(result[1].role).toBe('assistant')
      expect(result[1].content).toBe('Hi there!')
      expect(result[1].reasoning).toBe('Greeting response')
      expect(result[1].metadata?.model).toBe('gpt-4')
    })
  })

  describe('updatemessagecontent', () => {
    it('should update message content', () => {
      const original = createUIMessage('user', 'Original content')
      const updated = updateMessageContent(original, 'New content')

      expect(updated.content).toBe('New content')
      expect(updated.id).toBe(original.id)
      expect(updated.timestamp).toBe(original.timestamp)
    })

    it('should append content in append mode', () => {
      const original = createUIMessage('assistant', 'Original')
      const updated = updateMessageContent(original, ' appended', { appendMode: true })

      expect(updated.content).toBe('Original appended')
    })

    it('should update timestamp when requested', () => {
      const original = createUIMessage('user', 'Content')
      const originalTimestamp = original.timestamp
      // Mock Date.now to return a different value
      const mockNow = vi.fn().mockReturnValue(originalTimestamp + 1000)
      const originalDateNow = Date.now
      Date.now = mockNow

      const updated = updateMessageContent(original, 'New content', { updateTimestamp: true })

      expect(updated.timestamp).toBeGreaterThan(original.timestamp)
      expect(mockNow).toHaveBeenCalled()

      // Restore original Date.now
      Date.now = originalDateNow
    })

    it('should not append non-string content', () => {
      const original = createUIMessage('user', [{ type: 'text', text: 'Original' }] as MessageContent)
      const newContent: MessageContent = [{ type: 'text', text: 'New' }]
      const updated = updateMessageContent(original, newContent, { appendMode: true })

      expect(updated.content).toEqual(newContent)
    })
  })

  describe('updatemessagereasoning', () => {
    it('should update reasoning for assistant messages', () => {
      const original = createUIMessage('assistant', 'Response')
      const updated = updateMessageReasoning(original, 'My reasoning')

      expect(updated.reasoning).toBe('My reasoning')
    })

    it('should append reasoning in append mode', () => {
      const original = createUIMessage('assistant', 'Response', { reasoning: 'Initial' })
      const updated = updateMessageReasoning(original, ' additional', true)

      expect(updated.reasoning).toBe('Initial additional')
    })

    it('should replace reasoning when append mode is false', () => {
      const original = createUIMessage('assistant', 'Response', { reasoning: 'Initial' })
      const updated = updateMessageReasoning(original, 'New reasoning', false)

      expect(updated.reasoning).toBe('New reasoning')
    })

    it('should warn and return original for non-assistant messages', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const original = createUIMessage('user', 'Question')
      const updated = updateMessageReasoning(original, 'Reasoning')

      expect(updated).toBe(original)
      expect(consoleSpy).toHaveBeenCalledWith('Reasoning can only be updated for assistant messages')
      consoleSpy.mockRestore()
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
        { type: 'image_url', image_url: { url: 'http://example.com/image.jpg' } },
        { type: 'function_call', function_call: { name: 'search', arguments: '{}' } },
        { type: 'tool_call', tool_call: { id: 'tool-1', type: 'function' } },
      ]

      const result = messageContentToString(content)
      expect(result).toBe('Hello [图片: http://example.com/image.jpg] [函数调用: search] [工具调用: tool-1]')
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

  describe('unifiedstreamparser', () => {
    it('should create parser with callbacks', () => {
      const onMessageUpdate = vi.fn()
      const onMessageComplete = vi.fn()
      const onUsageUpdate = vi.fn()

      const parser = createUnifiedStreamParser({
        onMessageUpdate,
        onMessageComplete,
        onUsageUpdate,
      })

      expect(parser).toBeDefined()
      expect(typeof parser.parseEvent).toBe('function')
      expect(typeof parser.reset).toBe('function')
    })

    it('should handle output_item.added event', () => {
      const onMessageUpdate = vi.fn()
      const onMessageComplete = vi.fn()
      const onUsageUpdate = vi.fn()

      const parser = createUnifiedStreamParser({
        onMessageUpdate,
        onMessageComplete,
        onUsageUpdate,
      })

      const event = {
        type: 'response.output_item.added',
        item: { id: 'test', type: 'message' },
        output_index: 0,
        sequence_number: 1,
      }

      parser.parseEvent(event as any)

      // Should create a new message and call onMessageUpdate
      expect(onMessageUpdate).toHaveBeenCalledTimes(1)
      const calledMessage = onMessageUpdate.mock.calls[0][0]
      expect(calledMessage.role).toBe('assistant')
      expect(calledMessage.content).toBe('')
    })

    it('should handle text delta events', () => {
      const onMessageUpdate = vi.fn()
      const onMessageComplete = vi.fn()
      const onUsageUpdate = vi.fn()

      const parser = createUnifiedStreamParser({
        onMessageUpdate,
        onMessageComplete,
        onUsageUpdate,
      })

      // First create a message
      parser.parseEvent({
        type: 'response.output_item.added',
        item: { id: 'test', type: 'message' },
        output_index: 0,
        sequence_number: 1,
      } as any)

      // Then send delta
      parser.parseEvent({
        type: 'response.output_text.delta',
        delta: 'Hello',
        content_index: 0,
        item_id: 'test',
        output_index: 0,
        sequence_number: 2,
      } as any)

      expect(onMessageUpdate).toHaveBeenCalledTimes(2)
      const updatedMessage = onMessageUpdate.mock.calls[1][0]
      expect(updatedMessage.content).toBe('Hello')
    })

    it('should handle response completed with usage', () => {
      const onMessageUpdate = vi.fn()
      const onMessageComplete = vi.fn()
      const onUsageUpdate = vi.fn()

      const parser = createUnifiedStreamParser({
        onMessageUpdate,
        onMessageComplete,
        onUsageUpdate,
      })

      const event = {
        type: 'response.completed',
        response: {
          usage: {
            input_tokens: 10,
            output_tokens: 20,
          },
        },
        sequence_number: 3,
      }

      parser.parseEvent(event as any)

      expect(onUsageUpdate).toHaveBeenCalledTimes(1)
      expect(onUsageUpdate).toHaveBeenCalledWith({
        input_tokens: 10,
        output_tokens: 20,
        total_tokens: 30,
      })
    })

    it('should reset parser state', () => {
      const onMessageUpdate = vi.fn()
      const onMessageComplete = vi.fn()
      const onUsageUpdate = vi.fn()

      const parser = createUnifiedStreamParser({
        onMessageUpdate,
        onMessageComplete,
        onUsageUpdate,
      })

      // Create a message
      parser.parseEvent({
        type: 'response.output_item.added',
        item: { id: 'test', type: 'message' },
        output_index: 0,
        sequence_number: 1,
      } as any)
      parser.parseEvent({
        type: 'response.output_text.delta',
        delta: 'Hello',
        content_index: 0,
        item_id: 'test',
        output_index: 0,
        sequence_number: 2,
      } as any)

      // Reset
      parser.reset()

      // Should start fresh
      parser.parseEvent({
        type: 'response.output_item.added',
        item: { id: 'test2', type: 'message' },
        output_index: 0,
        sequence_number: 1,
      } as any)
      const newMessage = onMessageUpdate.mock.calls.at(-1)![0]
      expect(newMessage.content).toBe('')
    })
  })
})
