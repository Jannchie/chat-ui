import type { ChatData } from '../composables/chat-types'
import { del as idbDel, get as idbGet } from 'idb-keyval'
import { ref, shallowRef, toRaw } from 'vue'
import { db } from '../composables/useDatabase'

// Dexie 行记录：ChatData 本身不带时间戳，落库时补充排序字段
interface ChatHistoryRow extends ChatData {
  createdAt: number
  updatedAt: number
}

// 内存态（新会话在前），组件只读这份数据；持久化按行写 Dexie，
// 发一条消息只重写对应会话，而不是整个聊天历史
export const chatList = shallowRef<ChatData[]>([])
export const chatHistoryLoaded = ref(false)

// 加载窗口内的写入先落在内存和缓冲区，加载完成后再补写。
// 直接写 Dexie 会和迁移检查（表空才迁移）竞态，可能丢掉全部旧数据
const pendingPuts = new Map<string, ChatHistoryRow>()
const pendingDeletes = new Set<string>()

function toRow(chat: ChatData, now: number): ChatHistoryRow {
  const raw = toRaw(chat) as ChatData & Partial<ChatHistoryRow>
  const existing = chatList.value.find(c => c.id === raw.id) as
    | ChatHistoryRow
    | undefined
  return {
    ...raw,
    createdAt: raw.createdAt ?? existing?.createdAt ?? now,
    updatedAt: now,
  }
}

export function getChat(id: string): ChatData | null {
  return chatList.value.find(chat => chat.id === id) ?? null
}

export function setChat(chat: ChatData) {
  const row = toRow(chat, Date.now())
  const index = chatList.value.findIndex(c => c.id === row.id)
  const next = [...chatList.value]
  if (index === -1) {
    next.unshift(row)
  }
  else {
    next[index] = row
  }
  chatList.value = next

  if (!chatHistoryLoaded.value) {
    pendingDeletes.delete(row.id)
    pendingPuts.set(row.id, row)
    return
  }
  db.chatHistory.put(row).catch((error) => {
    console.error('Failed to persist chat:', error)
  })
}

export function deleteChat(id: string) {
  const index = chatList.value.findIndex(c => c.id === id)
  if (index !== -1) {
    const next = [...chatList.value]
    next.splice(index, 1)
    chatList.value = next
  }

  if (!chatHistoryLoaded.value) {
    pendingPuts.delete(id)
    pendingDeletes.add(id)
    return
  }
  db.chatHistory.delete(id).catch((error) => {
    console.error('Failed to delete chat:', error)
  })
}

// 旧版本把全部会话存在 idb-keyval 的单键下，首次启动时整体搬进按行存储
async function migrateLegacyChatHistory(): Promise<void> {
  const count = await db.chatHistory.count()
  if (count > 0) {
    return
  }
  const legacy = await idbGet<ChatData[]>('chatHistory')
  if (!Array.isArray(legacy) || legacy.length === 0) {
    return
  }
  const base = Date.now()
  const rows: ChatHistoryRow[] = legacy
    .filter(chat => chat && typeof chat.id === 'string')
    .map((chat, index) => ({
      ...chat,
      // 旧数据无时间戳，按原数组顺序（新的在前）合成 createdAt 保持排序
      createdAt: base - index,
      updatedAt: base - index,
    }))
  await db.chatHistory.bulkPut(rows)
  await idbDel('chatHistory')
}

async function loadChatHistory(): Promise<void> {
  try {
    await migrateLegacyChatHistory()
    const rows = await db.chatHistory.orderBy('createdAt').reverse().toArray()
    const loaded = rows.filter(
      row => !pendingDeletes.has(row.id) && !pendingPuts.has(row.id),
    )
    // 加载窗口内新建/更新的会话已经在内存里，保持在最前
    chatList.value = [...chatList.value, ...loaded]
  }
  catch (error) {
    console.error('Failed to load chat history:', error)
  }
  finally {
    chatHistoryLoaded.value = true
    if (pendingPuts.size > 0) {
      db.chatHistory.bulkPut([...pendingPuts.values()]).catch((error) => {
        console.error('Failed to persist chats written during load:', error)
      })
      pendingPuts.clear()
    }
    if (pendingDeletes.size > 0) {
      db.chatHistory.bulkDelete([...pendingDeletes]).catch((error) => {
        console.error('Failed to delete chats removed during load:', error)
      })
      pendingDeletes.clear()
    }
  }
}

export const chatHistoryReady = loadChatHistory()
