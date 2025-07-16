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
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    @click="close"
  >
    <div class="relative h-full w-full flex items-center justify-center p-4">
      <img
        :src="imageUrl"
        alt="Preview"
        class="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
        @click.stop
      >
    </div>
  </div>
</template>
