<script setup lang="ts">
import type { ChatData } from '../composables/useHelloWorld'

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
    class="relative w-full text-sm"
    @click="onClick"
  >
    <div
      :class="{
        'bg-blue-5/30 text-blue-2 ': active,
        'hover:bg-neutral-8': !active,
      }"
      class="flex items-center gap-2 rounded-full py-1 pl-2 pr-1"
    >
      <i class="i-tabler-message m-2 flex-shrink-0" />
      <span class="flex-grow overflow-x-hidden text-ellipsis text-left text-nowrap">
        {{ chatData.title ?? 'Untitled Chat' }}
      </span>
      <button
        v-if="hover || showMenu"
        :class="{
          'hover:bg-neutral-9/25': active,
          'hover:bg-neutral-7/25': !active,
          'bg-neutral-9/25': showMenu && active,
          'bg-neutral-7/25': showMenu && !active,
        }"
        class="rounded-full p-2 leading-0"
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
      class="fixed inset-0 z-9"
    />
  </button>
</template>
