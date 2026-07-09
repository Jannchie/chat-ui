import type { ChatData } from '../composables/chat-types'
import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeChat(id: string, title: string): ChatData {
  return {
    id,
    title,
    token: { inTokens: 0, outTokens: 0 },
    conversation: [],
  }
}

// 存储模块在导入时启动异步加载，每个用例都要全新的模块注册表和 IndexedDB
async function importStore() {
  return import('../shared/chat-history')
}

async function importDb() {
  const { db } = await import('../composables/useDatabase')
  return db
}

beforeEach(async () => {
  // 重置源码模块（chat-history 的内存态在模块顶层），
  // 底层 fake IndexedDB 是共享的，用清库隔离用例数据
  vi.resetModules()
  const db = await importDb()
  await db.chatHistory.clear()
  const { del } = await import('idb-keyval')
  await del('chatHistory')
})

describe('chat history store', () => {
  it('migrates the legacy single-key history into per-chat rows and removes the legacy key', async () => {
    const { set, get } = await import('idb-keyval')
    // 旧格式：新会话在数组前面
    await set('chatHistory', [makeChat('b', 'newer'), makeChat('a', 'older')])

    const store = await importStore()
    await store.chatHistoryReady

    expect(store.chatList.value.map(chat => chat.id)).toEqual(['b', 'a'])
    const db = await importDb()
    expect(await db.chatHistory.count()).toBe(2)
    expect(await get('chatHistory')).toBeUndefined()
  })

  it('persists setchat as a single row and keeps newest-first order across reloads', async () => {
    const store = await importStore()
    await store.chatHistoryReady

    store.setChat(makeChat('a', 'first'))
    store.setChat(makeChat('b', 'second'))
    // 更新旧会话不应改变它的排序位置
    store.setChat(makeChat('a', 'first updated'))

    expect(store.chatList.value.map(chat => chat.id)).toEqual(['b', 'a'])

    const db = await importDb()
    await vi.waitFor(async () => {
      expect(await db.chatHistory.count()).toBe(2)
      const updated = await db.chatHistory.get('a')
      expect(updated?.title).toBe('first updated')
    })

    // 模拟重新打开应用：同一个 IndexedDB，全新模块实例
    vi.resetModules()
    const reloaded = await importStore()
    await reloaded.chatHistoryReady
    expect(reloaded.chatList.value.map(chat => chat.id)).toEqual(['b', 'a'])
    expect(reloaded.chatList.value[1].title).toBe('first updated')
  })

  it('buffers writes made before loading finishes without losing legacy data', async () => {
    const { set } = await import('idb-keyval')
    await set('chatHistory', [makeChat('legacy', 'old chat')])

    const store = await importStore()
    // 加载尚未完成，此时的写入走缓冲区
    expect(store.chatHistoryLoaded.value).toBe(false)
    store.setChat(makeChat('fresh', 'created during load'))

    await store.chatHistoryReady

    expect(store.chatList.value.map(chat => chat.id)).toEqual([
      'fresh',
      'legacy',
    ])
    const db = await importDb()
    await vi.waitFor(async () => {
      expect(await db.chatHistory.count()).toBe(2)
    })
  })

  it('deletes a chat from memory and storage', async () => {
    const store = await importStore()
    await store.chatHistoryReady

    store.setChat(makeChat('a', 'first'))
    store.setChat(makeChat('b', 'second'))
    store.deleteChat('a')

    expect(store.chatList.value.map(chat => chat.id)).toEqual(['b'])

    const db = await importDb()
    await vi.waitFor(async () => {
      expect(await db.chatHistory.get('a')).toBeUndefined()
      expect(await db.chatHistory.get('b')).toBeDefined()
    })
  })
})
