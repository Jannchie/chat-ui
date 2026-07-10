<script setup lang="ts">
const model = defineModel<boolean>()

onKeyStroke('Escape', () => {
  if (model.value) {
    model.value = false
  }
})
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="model"
        class="fixed inset-0 z-100 flex items-center justify-center bg-black/50"
        @click.self="model = false"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.15s ease;
}
.modal-enter-active > :deep(*),
.modal-leave-active > :deep(*) {
  transition: transform 0.15s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
.modal-enter-from > :deep(*),
.modal-leave-to > :deep(*) {
  transform: scale(0.97);
}
</style>
