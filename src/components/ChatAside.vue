<script setup lang="ts">
import { vAutoAnimate } from '@formkit/auto-animate'
import { computed, ref } from 'vue'
import { chatHistory, useCurrentChat } from '../shared'
import { deleteChat } from '../utils'

const router = useRouter()
function onNewChatClick() {
  router.push({
    name: 'chat-home',
  })
}
const currentChat = useCurrentChat()
const displayLimit = ref(5)
const showAll = ref(false)

const displayedChats = computed(() => {
  return showAll.value ? chatHistory.value : chatHistory.value.slice(0, displayLimit.value)
})

function toggleShowMore() {
  showAll.value = !showAll.value
}
const openedMenuChat = ref<ChatData | null>(null)
const mouse = useMouse({
  target: globalThis,
})
provide('openedMenuChat', openedMenuChat)
const menuRef = ref<HTMLElement | null>(null)
const hasMoreChats = computed(() => chatHistory.value.length > displayLimit.value)
const openedXY = ref({ x: 0, y: 0 })
watch([openedMenuChat], () => {
  if (!openedMenuChat.value) {
    return
  }
  openedXY.value = { x: mouse.x.value, y: mouse.y.value }
}, { immediate: true })
onClickOutside(menuRef, (e) => {
  if (!openedMenuChat.value) {
    return
  }
  e.stopPropagation()
  openedMenuChat.value = null
})

async function onDelete(e: MouseEvent) {
  e.stopPropagation()
  e.preventDefault()
  // showMenu.value = false
  const openedMenuChatValue = openedMenuChat.value
  if (!openedMenuChatValue) {
    return
  }
  deleteChat(openedMenuChatValue.id)
  if (currentChat.value?.id === openedMenuChatValue.id) {
    router.push('/chat')
  }
  openedMenuChat.value = null
}
</script>

<template>
  <AsideContainer>
    <div class="mt-104px pb-4">
      <menu
        v-if="openedMenuChat"
        ref="menuRef"
        :style="{ top: `${openedXY.y}px`, left: `${openedXY.x}px` }"
        class="fixed z-10"
      >
        <div class="dark:bg-neutral-8 rounded-md bg-neutral-200 w-32 overflow-hidden">
          <button
            class="dark:hover:bg-neutral-7 px-4 py-2 w-full hover:bg-neutral-300"
            @click="onDelete"
          >
            Delete
          </button>
        </div>
      </menu>
      <button
        :disabled="currentChat === null"
        class="dark:hover:bg-neutral-7 leading-0 px-4 py-3 rounded-full bg-neutral-300 flex gap-4 min-w-130px items-center dark:bg-neutral-800 hover:bg-neutral-400 disabled:op-50 disabled:pointer-events-none"
        @click="onNewChatClick"
      >
        <i class="i-tabler-plus h-5 w-5" />
        <span class="text-sm flex-grow-1">
          New Chat
        </span>
      </button>
    </div>
    <div class="my-2 px-4 flex items-center justify-between">
      <span class="text-sm">Recent Chat</span>
      <button
        v-if="hasMoreChats"
        role="button"
        class="text-xs dark:text-blue-200"
        @click="toggleShowMore"
      >
        {{ showAll ? 'Show Less' : `Show More (${chatHistory.length - displayLimit})` }}
      </button>
    </div>
    <div class="flex-grow basis-0 overflow-x-hidden overflow-y-auto">
      <div v-auto-animate>
        <ChatItem
          v-for="chat in displayedChats"
          :key="chat.id"
          :chat-data="chat"
          :active="chat.id === currentChat?.id"
        />
      </div>
    </div>
  </AsideContainer>
</template>
