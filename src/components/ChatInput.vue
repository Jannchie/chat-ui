<script setup lang="ts">
import type { ImageFile } from '../composables/chat-types'
import ImageUpload from './ImageUpload.vue'
import PromptOptimizeButton from './PromptOptimizeButton.vue'

interface Props {
  modelValue: string
  streaming: boolean
  uploadedImages: ImageFile[]
  rows?: number
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'update:uploadedImages', value: ImageFile[]): void
  (e: 'submit'): void
  (e: 'enter', event: KeyboardEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  rows: 1,
})
const emit = defineEmits<Emits>()

const input = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
})

const images = computed({
  get: () => props.uploadedImages,
  set: (value: ImageFile[]) => emit('update:uploadedImages', value),
})

const textareaRef = ref<HTMLTextAreaElement>()

// Auto-resize textarea based on content
const actualRows = ref(props.rows)
watch([input, textareaRef], () => {
  nextTick(() => {
    if (textareaRef.value) {
      const targetRows = getNumberOfLines(textareaRef.value)
      actualRows.value = Math.max(targetRows, props.rows)
    }
  })
}, { immediate: true })

function getNumberOfLines(textarea: HTMLTextAreaElement): number {
  textarea.style.height = '0px'
  const style = globalThis.getComputedStyle(textarea)
  const lineHeight = Number.parseInt(style.lineHeight)
  const padding = Number.parseInt(style.paddingTop) + Number.parseInt(style.paddingBottom)
  const textareaHeight = textarea.scrollHeight - padding
  const numberOfLines = Math.ceil(textareaHeight / lineHeight)
  textarea.style.height = ''
  return numberOfLines
}

function onSubmit() {
  emit('submit')
}

function onEnter(e: KeyboardEvent) {
  emit('enter', e)
}

// Focus textarea when component is mounted or when streaming stops
watch(() => props.streaming, (streaming) => {
  if (!streaming) {
    nextTick(() => {
      textareaRef.value?.focus()
    })
  }
})

onMounted(() => {
  textareaRef.value?.focus()
})
</script>

<template>
  <div class="input-section px-4 flex shrink-0 flex-col gap-1 min-h-120px items-center justify-end relative">
    <div class="leading-0 max-w-830px w-full relative z-10">
      <!-- Image preview area above input panel -->
      <div
        v-if="images.length > 0"
        class="mb-3 pt-3 flex flex-wrap gap-3"
      >
        <div
          v-for="image in images"
          :key="image.id"
          class="group relative"
        >
          <img
            :src="image.dataUrl"
            :alt="image.file.name"
            class="dark:border-neutral-6 border border-neutral-300 rounded-lg h-16 w-16 object-cover"
          >
          <button
            class="dark:hover:bg-neutral-7 rounded-full bg-neutral-300 opacity-0 flex h-6 w-6 transition-opacity items-center justify-center absolute dark:bg-neutral-800 hover:bg-neutral-400 group-hover:opacity-100 -right-2 -top-2"
            @click="images = images.filter((img: ImageFile) => img.id !== image.id)"
          >
            <i class="i-tabler-x text-neutral-3 h-4 w-4" />
          </button>
        </div>
      </div>

      <!-- Unified input panel -->
      <div
        class="rounded-xl bg-neutral-100 transition-all relative dark:bg-[#1e1e1f] focus-within:bg-neutral-200 hover:bg-neutral-200 dark:focus-within:bg-neutral-800 dark:hover:bg-neutral-800"
      >
        <!-- Textarea without border -->
        <textarea
          ref="textareaRef"
          v-model="input"
          type="text"
          style="resize: none; scrollbar-width: none; max-height: 300px; height: auto;"
          :rows="actualRows"
          class="text-lg text-neutral-800 px-4 py-4 pb-12 outline-none border-none bg-transparent flex-grow-0 w-full dark:text-[#e3e3e3]"
          placeholder="Input your question here"
          @keypress.stop.prevent.enter="onEnter"
        />

        <!-- Bottom buttons -->
        <div class="flex items-center bottom-2 left-2 right-2 justify-between absolute">
          <!-- Image upload button - bottom left -->
          <div>
            <ImageUpload v-model="images" />
          </div>

          <!-- Prompt optimize and send buttons - bottom right -->
          <div class="flex gap-2 items-center">
            <!-- Prompt optimize button -->
            <PromptOptimizeButton
              v-model="input"
              :disabled="streaming"
              size="md"
              variant="ghost"
              @optimized="(optimizedPrompt: string) => {
                // Optional: Show a toast notification or animation
                console.log('Prompt optimized:', optimizedPrompt)
              }"
            />

            <!-- Send button -->
            <button
              :disabled="streaming || (!input.trim() && images.length === 0)"
              :class="{
                'opacity-50 cursor-not-allowed': streaming || (!input.trim() && images.length === 0),
                'hover:bg-neutral-7': !streaming && (input.trim() || images.length > 0),
              }"
              class="color-[#c4c7c5] rounded-lg flex h-8 w-8 transition-all items-center justify-center"
              @click="onSubmit"
            >
              <i class="i-tabler-send h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
