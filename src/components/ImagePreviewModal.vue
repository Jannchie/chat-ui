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
</script>

<template>
  <Modal :model-value="visible" @update:model-value="close">
    <div class="relative h-full w-full flex items-center justify-center p-4">
      <img
        :src="imageUrl"
        alt="Preview"
        class="max-h-[85vh] max-w-[85vw] rounded-lg object-contain"
        @click.stop
      >
    </div>
  </Modal>
</template>
