<script setup lang="ts">
import { Modal } from '@roku-ui/vue'

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
</script>

<template>
  <Modal :model-value="visible" @update:model-value="close">
    <div class="p-4 flex h-full w-full items-center justify-center relative">
      <img
        :src="imageUrl"
        alt="Preview"
        class="rounded-lg max-h-[85vh] max-w-[85vw] object-contain"
        @click.stop
      >
    </div>
  </Modal>
</template>
