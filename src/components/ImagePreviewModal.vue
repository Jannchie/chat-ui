<script setup lang="ts">
defineProps<{
  visible: boolean
  imageUrl: string
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
}>()

function close() {
  emit('update:visible', false)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close()
  }
}

onMounted(() => {
  globalThis.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  globalThis.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    v-if="visible"
    class="bg-black/80 flex items-center inset-0 justify-center fixed z-50 backdrop-blur-sm"
    @click="close"
  >
    <div class="p-4 flex h-full w-full items-center justify-center relative">
      <img
        :src="imageUrl"
        alt="Preview"
        class="rounded-lg max-h-[85vh] max-w-[85vw] object-contain"
        @click.stop
      >
    </div>
  </div>
</template>
