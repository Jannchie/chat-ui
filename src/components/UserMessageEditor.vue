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
    class="w-full border border-neutral-300/60 rounded-2xl bg-neutral-200/70 px-4 py-3 dark:border-neutral-700/60 dark:bg-elevated"
  >
    <textarea
      ref="textarea"
      v-model="editContent"
      rows="1"
      style="scrollbar-width: thin"
      class="max-h-80 w-full resize-none overflow-y-auto border-none bg-transparent text-sm leading-relaxed outline-none md:text-base dark:text-neutral-100"
      @keydown="onKeydown"
    />
    <div class="mt-2 flex items-center gap-2">
      <span
        class="hidden text-xs text-neutral-400 md:inline dark:text-neutral-500"
      >
        Enter to send · Esc to cancel
      </span>
      <div class="ml-auto flex gap-2">
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-sm transition-colors hover:bg-neutral-300/60 dark:text-neutral-400 hover:text-neutral-700 dark:hover:bg-neutral-700 dark:hover:text-neutral-200"
          @click="emit('cancel')"
        >
          Cancel
        </button>
        <button
          type="button"
          class="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-1.5 text-sm text-white transition-colors dark:bg-neutral-100 hover:bg-neutral-700 dark:text-neutral-900 dark:hover:bg-white"
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
