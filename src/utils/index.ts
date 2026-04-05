import type { ChatData } from '../composables/chat-types'
import { v7 as uuidv7 } from 'uuid'
import { computed, toRaw } from 'vue'
import { chatHistoryIDB } from '../shared'

export * from './platform'

const MOBILE_USER_AGENT_REGEXP
  = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i

export const isMobile = computed(() => {
  return MOBILE_USER_AGENT_REGEXP.test(navigator.userAgent)
})
export function generateId() {
  // Always use UUIDv7 from external library to avoid custom implementations
  return uuidv7()
}

export function getChat(id: string) {
  return chatHistoryIDB.data.value.find(chat => chat.id === id) ?? null
}

export function setChat(chat: ChatData) {
  const index = chatHistoryIDB.data.value.findIndex(c => c.id === chat.id)
  if (index === -1) {
    chatHistoryIDB.data.value.unshift(toRaw(chat))
  }
  else {
    chatHistoryIDB.data.value[index] = toRaw(chat)
  }
  chatHistoryIDB.data.value = [...chatHistoryIDB.data.value]
}

export function deleteChat(id: string) {
  const index = chatHistoryIDB.data.value.findIndex(c => c.id === id)
  if (index !== -1) {
    chatHistoryIDB.data.value.splice(index, 1)
    chatHistoryIDB.data.value = [...chatHistoryIDB.data.value]
  }
}
