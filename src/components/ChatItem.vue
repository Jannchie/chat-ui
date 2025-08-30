<script setup lang="ts">
import type { ChatData } from '../composables/chat-types'

const props = defineProps<{
  chatData: ChatData
  active: boolean
}>()
const buttonRef = ref<HTMLElement | null>(null)
const hover = useElementHover(buttonRef)
const openedMenuChat = inject<Ref<ChatData | null>>('openedMenuChat', ref(null))
function onActionClick(e: MouseEvent) {
  e.stopPropagation()
  e.preventDefault()
  openedMenuChat.value = props.chatData
}
const showMenu = computed(() => openedMenuChat.value?.id === props.chatData.id)

const router = useRouter()
function onClick() {
  router.push({
    name: 'chat',
    params: {
      id: props.chatData.id,
    },
  })
}
</script>

<template>
  <button
    ref="buttonRef"
    class="text-sm w-full relative"
    @click="onClick"
  >
    <div
      :class="{
        'bg-blue-500/30 dark:text-blue-200 text-blue-500': active,
        'hover:bg-neutral-200 dark:hover:bg-neutral-800': !active,
      }"
      class="py-1 pl-2 pr-1 rounded-full flex gap-2 items-center"
    >
      <i class="i-tabler-message m-2 flex-shrink-0" />
      <span class="text-left flex-grow text-nowrap text-ellipsis overflow-x-hidden">
        {{ chatData.title ?? 'Untitled Chat' }}
      </span>
      <button
        v-if="hover || showMenu"
        :class="{
          'hover:bg-neutral-300/25 dark:hover:bg-neutral-900/25': active,
          'hover:bg-neutral-300/25 dark:hover:bg-neutral-700/25': !active,
          'bg-neutral-300/25 dark:bg-neutral-900/25': showMenu && active,
          'bg-neutral-300/25 dark:bg-neutral-700/25': showMenu && !active,
        }"
        class="leading-0 p-2 rounded-full"
        @click="onActionClick"
      >
        <i
          v-if="hover || showMenu"
          class="i-tabler-dots-vertical"
        />
      </button>
    </div>
    <div
      v-if="showMenu"
      class="inset-0 fixed z-9"
    />
  </button>
</template>
