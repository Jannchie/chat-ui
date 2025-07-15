import { createUIMessage } from '../utils/messageTransform'

// 测试模型名称显示
export function testModelDisplay() {
  const testMessage = createUIMessage('assistant', 'Hello! This is a test message.', {
    metadata: {
      sentAt: Date.now() - 3000, // 3 秒前发送
      receivedAt: Date.now() - 2000, // 2 秒前收到 (1秒响应时间)
      model: 'gpt-4-turbo',
    },
  })

  return testMessage
}

// 模拟不同模型的消息
export function createMessagesWithDifferentModels() {
  return [
    createUIMessage('assistant', 'Response from GPT-4', {
      metadata: {
        sentAt: Date.now() - 5000,
        receivedAt: Date.now() - 4500,
        model: 'gpt-4',
      },
    }),

    createUIMessage('assistant', 'Response from Claude', {
      metadata: {
        sentAt: Date.now() - 3000,
        receivedAt: Date.now() - 2800,
        model: 'claude-3-sonnet',
      },
    }),

    createUIMessage('assistant', 'Response from Gemini', {
      metadata: {
        sentAt: Date.now() - 1000,
        receivedAt: Date.now() - 800,
        model: 'gemini-pro',
      },
    }),
  ]
}
