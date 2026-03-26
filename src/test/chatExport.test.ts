import { describe, expect, it } from 'vitest'
import { serializeChatForExport } from '../utils/chatExport'

describe('serializeChatForExport', () => {
  it('serializes chat data to the public export schema', () => {
    const result = serializeChatForExport({
      id: 'chat-1',
      title: 'Export Title',
      token: {
        inTokens: 123,
        outTokens: 456,
      },
      conversation: [
        {
          id: 'message-1',
          role: 'user',
          content: 'Hello',
          timestamp: 111,
          metadata: {
            sentAt: 111,
          },
        },
        {
          id: 'message-2',
          role: 'assistant',
          content: 'World',
          timestamp: 222,
          reasoning: 'internal reasoning summary',
          metadata: {
            sentAt: 222,
            model: 'gpt-5.4',
            preset: 'openai',
            firstTokenAt: 230,
            receivedAt: 250,
            tokenSpeed: 10.5,
            usage: {
              input_tokens: 12,
              output_tokens: 34,
              total_tokens: 46,
            },
          },
          versions: [
            {
              id: 'version-1',
              content: 'World',
              createdAt: 222,
              metadata: {
                sentAt: 222,
                usage: {
                  input_tokens: 12,
                  output_tokens: 34,
                  total_tokens: 46,
                },
              },
            },
          ],
          activeVersionIndex: 0,
        },
      ],
    })

    expect(result).toEqual({
      id: 'chat-1',
      title: 'Export Title',
      conversation: [
        {
          id: 'message-1',
          role: 'user',
          content: 'Hello',
          timestamp: 111,
          metadata: {
            sentAt: 111,
          },
        },
        {
          id: 'message-2',
          role: 'assistant',
          content: 'World',
          timestamp: 222,
          reasoning: 'internal reasoning summary',
          metadata: {
            sentAt: 222,
            model: 'gpt-5.4',
            preset: 'openai',
            firstTokenAt: 230,
            receivedAt: 250,
            tokenSpeed: 10.5,
            usage: {
              input_tokens: 12,
              output_tokens: 34,
              total_tokens: 46,
            },
          },
          versions: [
            {
              id: 'version-1',
              content: 'World',
              createdAt: 222,
              metadata: {
                sentAt: 222,
                usage: {
                  input_tokens: 12,
                  output_tokens: 34,
                  total_tokens: 46,
                },
              },
            },
          ],
          activeVersionIndex: 0,
        },
      ],
      token: {
        inTokens: 123,
        outTokens: 456,
      },
    })
  })

  it('omits undefined internal fields from exported messages', () => {
    const result = serializeChatForExport({
      id: 'chat-2',
      title: null,
      token: {
        inTokens: 0,
        outTokens: 0,
      },
      conversation: [
        {
          id: 'message-1',
          role: 'assistant',
          content: 'Hello',
          timestamp: 100,
        },
      ],
    })

    expect(result).toEqual({
      id: 'chat-2',
      title: null,
      conversation: [
        {
          id: 'message-1',
          role: 'assistant',
          content: 'Hello',
          timestamp: 100,
        },
      ],
      token: {
        inTokens: 0,
        outTokens: 0,
      },
    })
  })
})
