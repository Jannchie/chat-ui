<script setup lang="ts">
import { debouncedWatch, refDebounced } from '@vueuse/core'
import { computed, nextTick } from 'vue'
import { useStreamingText } from '../composables/useStreamingText'

interface StreamingTextProps {
  content: string
  loading: boolean
  debounceDelay?: number
  splitDelay?: number
  fadeInClass?: string
}

const props = withDefaults(defineProps<StreamingTextProps>(), {
  debounceDelay: 1000,
  splitDelay: 300,
  fadeInClass: 'fade-in',
})

const emit = defineEmits<{
  contentUpdated: [content: string]
}>()

const content = computed(() => props.content)
const loading = computed(() => props.loading)
const debouncedLoading = refDebounced(loading, props.debounceDelay)

// Use the streaming text composable
const { createStreamingContent } = useStreamingText({
  fadeInClass: props.fadeInClass,
})

const { formattedContent, contentFinal: baseFinal } = createStreamingContent(content, loading)

// Add emit functionality to contentFinal
const contentFinal = computed(() => {
  const result = baseFinal.value
  nextTick(() => {
    emit('contentUpdated', result)
  })
  return result
})

// Debounced content update watcher
debouncedWatch([content], () => {
  // Trigger re-computation when content changes
}, {
  debounce: props.splitDelay,
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
