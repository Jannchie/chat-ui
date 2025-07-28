<script setup lang="ts">
import type { MessageContent } from '../types/message'
import { onMounted, ref } from 'vue'

const props = defineProps<{
  content: MessageContent
}>()

const collapsed = ref<boolean>(true)
const contentRef = ref<HTMLElement | null>(null)
const needsCollapse = ref<boolean>(true)
const showImagePreview = ref<boolean>(false)
const previewImageUrl = ref<string>('')

const textContent = computed(() => {
  if (typeof props.content === 'string') {
    return props.content
  }
  const textItems = props.content.filter((item): item is { type: 'text', text: string } => item.type === 'text')
  return textItems.length > 0 ? textItems.map(item => item.text).join('\n') : ''
})

const imageItems = computed(() => {
  if (!Array.isArray(props.content)) {
    return []
  }
  return props.content.filter((item): item is { type: 'image_url', image_url: { url: string } } => item.type === 'image_url')
})

function openImagePreview(imageUrl: string) {
  previewImageUrl.value = imageUrl
  showImagePreview.value = true
}

// Check if content needs to be collapsed
onMounted(() => {
  if (contentRef.value) {
    // Check if content height exceeds 3 lines
    const lineHeight = Number.parseInt(getComputedStyle(contentRef.value).lineHeight)
    const contentHeight = contentRef.value.scrollHeight

    // If content height is less than or equal to 3 lines, no need to collapse
    needsCollapse.value = contentHeight > (lineHeight * 3)

    // If no need to collapse, set collapsed to false by default
    if (!needsCollapse.value) {
      collapsed.value = false
    }
  }
})
</script>

<template>
  <div class="flex-grow-1">
    <!-- Display images if any -->
    <div v-if="imageItems.length > 0" class="mb-3 flex flex-wrap gap-2">
      <div
        v-for="(item, index) in imageItems"
        :key="index"
        class="relative"
      >
        <img
          :src="item.image_url.url"
          alt="Uploaded image"
          class="border-neutral-6 border rounded-lg max-h-48 max-w-xs cursor-pointer object-cover"
          @click="openImagePreview(item.image_url.url)"
        >
      </div>
    </div>

    <!-- Display text content if any -->
    <pre
      v-if="textContent"
      ref="contentRef"
      class="font-inherit grow whitespace-pre-wrap overflow-hidden"
      :class="collapsed ? 'line-clamp-3' : 'line-clamp-none'"
      v-text="textContent"
    />
  </div>
  <div
    v-if="needsCollapse && textContent"
    class="shrink-0 w-10"
    @click="collapsed = !collapsed"
  >
    <button class="hover:bg-neutral-5/10 rounded-full flex h-10 w-10 items-center justify-center">
      <i
        :class="collapsed ? 'i-tabler-chevron-down' : 'i-tabler-chevron-up'"
      />
    </button>
  </div>

  <!-- Image Preview Modal -->
  <ImagePreviewModal
    v-model:visible="showImagePreview"
    :image-url="previewImageUrl"
  />
</template>
