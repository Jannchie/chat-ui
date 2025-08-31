<script setup lang="ts">
import { refDebounced } from '@vueuse/core'
import { computed, nextTick, toRef } from 'vue'
import { splitContent } from '../utils/streamingText'

interface StreamingTextProps {
  content: string
  loading: boolean
  debounceDelay?: number
  fadeInClass?: string
}

const props = withDefaults(defineProps<StreamingTextProps>(), {
  debounceDelay: 1000,
  fadeInClass: 'fade-in',
})

const emit = defineEmits<{
  contentUpdated: [content: string]
}>()

const loading = toRef(props, 'loading')
const debouncedLoading = refDebounced(loading, props.debounceDelay)

const formattedContent = computed(() => splitContent(props.content))

const contentFinal = computed(() => {
  const result = props.loading ? formattedContent.value : props.content
  nextTick(() => {
    emit('contentUpdated', result)
  })
  return result
})

// Expose utilities for external use
defineExpose({
  formattedContent,
  contentFinal,
  debouncedLoading,
})
</script>

<template>
  <div
    class="streaming-text-wrapper"
    :class="{ streaming: debouncedLoading }"
  >
    <div
      :class="debouncedLoading ? fadeInClass : ''"
      v-html="contentFinal"
    />
  </div>
</template>

<style scoped>
.streaming-text-wrapper {
  position: relative;
}

.fade-in {
  opacity: 0;
  animation: fadeIn 1s forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
</style>
