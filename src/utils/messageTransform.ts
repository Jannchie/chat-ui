import type { MessageContent } from '../types/message'

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
