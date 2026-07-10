<script setup lang="ts">
const props = defineProps<{
  initialContent: string
}>()
const emit = defineEmits<{
  (event: 'confirm', content: string): void
  (event: 'cancel'): void
}>()

const editContent = ref(props.initialContent)
const { textarea } = useTextareaAutosize({
  input: editContent,
})
const confirmDisabled = computed(() => {
  return editContent.value.trim().length === 0
})

// 编辑期间消息内容被外部更新（如规范化）时同步进来
watch(
  () => props.initialContent,
  (content) => {
    editContent.value = content
  },
)

onMounted(() => {
  nextTick(() => {
    const el = textarea.value
    if (!el) {
      return
    }
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  })
})

function confirmEdit(): void {
  if (confirmDisabled.value) {
    return
  }
  emit('confirm', editContent.value)
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    emit('cancel')
    return
  }
  if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
    event.preventDefault()
    confirmEdit()
  }
}
</script>

<template>
  <div
    class="px-4 py-3 border border-neutral-300/60 rounded-2xl bg-neutral-200/70 w-full dark:border-neutral-700/60 dark:bg-elevated"
  >
    <textarea
      ref="textarea"
      v-model="editContent"
      rows="1"
      style="scrollbar-width: thin"
      class="text-sm leading-relaxed outline-none border-none bg-transparent max-h-80 w-full resize-none overflow-y-auto md:text-base dark:text-neutral-100"
      @keydown="onKeydown"
    />
    <div class="mt-2 flex gap-2 items-center">
      <span
        class="text-xs text-neutral-400 hidden dark:text-neutral-500 md:inline"
      >
        Enter to send · Esc to cancel
      </span>
      <div class="ml-auto flex gap-2">
        <button
          type="button"
          class="text-sm px-3 py-1.5 rounded-full transition-colors dark:text-neutral-400 hover:text-neutral-700 hover:bg-neutral-300/60 dark:hover:text-neutral-200 dark:hover:bg-neutral-700"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="text-sm text-white px-4 py-1.5 rounded-full bg-neutral-900 flex gap-1.5 transition-colors items-center dark:text-neutral-900 dark:bg-neutral-100 hover:bg-neutral-700 dark:hover:bg-white"
          :class="{ 'opacity-50 cursor-not-allowed': confirmDisabled }"
          :disabled="confirmDisabled"
          @click="confirmEdit"
        >
          <i class="i-tabler-send h-3.5 w-3.5" />
          Send
        </button>
      </div>
    </div>
  </div>
</template>
