<script setup lang="ts">
import type { ImageFile } from '../composables/useHelloWorld'

const props = defineProps<{
  modelValue: ImageFile[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ImageFile[]]
}>()

const fileInput = ref<HTMLInputElement>()
const isDragging = ref(false)
const dragCounter = ref(0)

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

async function handleFiles(files: FileList | null) {
  if (!files) return

  const imageFiles: ImageFile[] = []
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    
    if (!file.type.startsWith('image/')) {
      continue
    }

    if (file.size > 20 * 1024 * 1024) {
      console.warn(`File ${file.name} is too large (max 20MB)`)
      continue
    }

    try {
      const dataUrl = await readFileAsDataURL(file)
      imageFiles.push({
        file,
        dataUrl,
        id: generateId(),
      })
    } catch (error) {
      console.error('Error reading file:', error)
    }
  }

  if (imageFiles.length > 0) {
    emit('update:modelValue', [...props.modelValue, ...imageFiles])
  }
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}


function onDragEnter(e: DragEvent) {
  e.preventDefault()
  dragCounter.value++
  isDragging.value = true
}

function onDragLeave(e: DragEvent) {
  e.preventDefault()
  dragCounter.value--
  if (dragCounter.value === 0) {
    isDragging.value = false
  }
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  isDragging.value = false
  dragCounter.value = 0
  handleFiles(e.dataTransfer?.files || null)
}

function openFileDialog() {
  fileInput.value?.click()
}
</script>

<template>
  <div class="image-upload">
    <input
      ref="fileInput"
      type="file"
      multiple
      accept="image/*"
      class="hidden"
      @change="handleFiles(($event.target as HTMLInputElement).files)"
    >

    <!-- Upload button -->
    <button
      @click="openFileDialog"
      class="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-4 hover:bg-neutral-7 transition-colors"
      title="Upload images"
    >
      <i class="i-tabler-photo h-5 w-5" />
    </button>
  </div>
</template>