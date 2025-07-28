<script setup lang="ts">
import { vAutoAnimate } from '@formkit/auto-animate'
import { computed, ref } from 'vue'
import { chatHistory, useCurrentChat } from '../shared'

const currentChat = useCurrentChat()
const displayLimit = ref(5)
const showAll = ref(false)

const displayedChats = computed(() => {
  return showAll.value ? chatHistory.value : chatHistory.value.slice(0, displayLimit.value)
})

function toggleShowMore() {
  showAll.value = !showAll.value
}

const hasMoreChats = computed(() => chatHistory.value.length > displayLimit.value)
</script>

<template>
  <div v-auto-animate>
    <ChatItem
      v-for="chat in displayedChats"
      :key="chat.id"
      :chat-data="chat"
      :active="chat.id === currentChat?.id"
    />

    <div
      v-if="hasMoreChats"
      class="mt-3 flex justify-center"
    >
      <button
        class="text-sm text-blue-600 px-4 py-2 hover:text-blue-800 hover:underline"
        @click="toggleShowMore"
      >
        {{ showAll ? 'Show Less' : `Show More (${chatHistory.length - displayLimit} more)` }}
      </button>
    </div>
  </div>
</template>

<style lang="css">
li > p {
  margin-top: 0.1rem;
  margin-bottom: 0.1rem;
}
</style>
