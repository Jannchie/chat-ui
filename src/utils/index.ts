import { v7 as uuidv7 } from 'uuid'
import { computed } from 'vue'

export { deleteChat, getChat, setChat } from '../shared/chat-history'
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
