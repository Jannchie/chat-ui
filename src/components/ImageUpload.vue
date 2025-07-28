<script setup lang="ts">
import type { ImageFile } from '../composables/useHelloWorld'

const props = defineProps<{
  modelValue: ImageFile[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: ImageFile[]]
}>()

const fileInput = ref<HTMLInputElement>()

// Handle paste events
onMounted(() => {
  globalThis.addEventListener('paste', handlePaste)
})

onUnmounted(() => {
  globalThis.removeEventListener('paste', handlePaste)
})

async function handlePaste(event: ClipboardEvent) {
  const clipboardItems = event.clipboardData?.items
  if (!clipboardItems) {
    return
  }

  const imageFiles: File[] = []

  for (const item of clipboardItems) {
    if (item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) {
        imageFiles.push(file)
      }
    }
  }

  if (imageFiles.length > 0) {
    // Create FileList-like object
    const fileList = {
      length: imageFiles.length,
      item: (index: number) => imageFiles[index] || null,
      * [Symbol.iterator]() {
        for (const file of imageFiles) {
          yield file
        }
      },
    } as FileList

    await handleFiles(fileList)
  }
}

function generateId() {
  return Math.random().toString(36).slice(2, 11)
}

async function handleFiles(files: FileList | null) {
  if (!files) {
    return
  }

  const imageFiles: ImageFile[] = []

  for (const file of files) {
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
    }
    catch (error) {
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
    reader.addEventListener('load', () => resolve(reader.result as string))
    reader.addEventListener('error', () => reject(reader.error))
    reader.readAsDataURL(file)
  })
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
      class="text-neutral-4 hover:bg-neutral-7 rounded-lg flex h-8 w-8 transition-colors items-center justify-center"
      title="Upload images"
      @click="openFileDialog"
    >
      <i class="i-tabler-photo h-5 w-5" />
    </button>
  </div>
</template>
