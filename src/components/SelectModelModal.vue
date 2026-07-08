<script setup lang="ts">
import { Modal } from '@roku-ui/vue'
import { computed, onBeforeUnmount, ref } from 'vue'
import { useModels } from '../composables'
import { platform } from '../shared'

// Define models
const modelValue = defineModel<boolean>()
const selectedModel = defineModel<string | null | undefined>('selectedModel')

// Search functionality
const searchQuery = ref('')
const { models, isLoading, error } = useModels()

const highlightedIndex = ref(-1)
const searchInputRef = ref<HTMLInputElement | null>(null)

const filteredModels = computed(() => {
  if (!searchQuery.value) {
    return models.value
  }
  const query = searchQuery.value.toLowerCase()
  return models.value.filter((model: string) =>
    model.toLowerCase().includes(query),
  )
})
// 列表内容变化（搜索、模型加载完成、切换平台）后旧索引不再有效
watch(filteredModels, () => {
  highlightedIndex.value = -1
})

function handleKeyDown(event: KeyboardEvent) {
  // Only handle keyboard events when modal is actually open
  if (!modelValue.value) {
    return
  }

  const count = filteredModels.value.length

  switch (event.key) {
    case 'ArrowDown': {
      event.preventDefault()
      if (count === 0) {
        break
      }
      highlightedIndex.value = (highlightedIndex.value + 1) % count
      break
    }
    case 'ArrowUp': {
      event.preventDefault()
      if (count === 0) {
        break
      }
      highlightedIndex.value
        = highlightedIndex.value <= 0
          ? count - 1
          : highlightedIndex.value - 1
      break
    }
    case 'Enter': {
      if (highlightedIndex.value >= 0 && highlightedIndex.value < count) {
        event.preventDefault()
        event.stopPropagation()
        updateModel(filteredModels.value[highlightedIndex.value])
      }
      break
    }
    default: {
      // Only focus search input if the event is not from it
      if (event.target !== searchInputRef.value) {
        searchInputRef.value?.focus()
      }
      break
    }
  }
}

// Only listen to keyboard events when modal is open.
// Reset transient state on any close path (select / backdrop / X button).
watch(modelValue, (isOpen) => {
  if (isOpen) {
    globalThis.addEventListener('keydown', handleKeyDown)
  }
  else {
    globalThis.removeEventListener('keydown', handleKeyDown)
    searchQuery.value = ''
    highlightedIndex.value = -1
  }
})

onBeforeUnmount(() => {
  globalThis.removeEventListener('keydown', handleKeyDown)
})

// Update model function
function updateModel(modelName: string | null | undefined) {
  selectedModel.value = modelName
  modelValue.value = false
}

// Close modal
function closeModal() {
  modelValue.value = false
}
</script>

<template>
  <Modal v-model="modelValue">
    <div
      class="mx-4 border border-neutral-200 rounded-2xl bg-white max-w-md w-full shadow-2xl overflow-hidden dark:border-neutral-800 dark:bg-[#1a1a1a]"
    >
      <div
        class="px-5 py-4 border-b border-neutral-200 flex items-center justify-between dark:border-neutral-800"
      >
        <h2 class="text-base text-neutral-800 font-semibold dark:text-white">
          Select Model
        </h2>
        <button
          class="text-neutral-400 rounded-full flex h-8 w-8 transition-colors items-center justify-center hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-white dark:hover:bg-neutral-800"
          @click="closeModal"
        >
          <i class="i-tabler-x" />
        </button>
      </div>

      <!-- Search bar -->
      <div class="px-3 pt-3">
        <div class="relative">
          <i
            class="i-tabler-search text-sm text-neutral-400 transform left-3 top-1/2 absolute -translate-y-1/2"
          />
          <input
            ref="searchInputRef"
            v-model="searchQuery"
            type="text"
            class="text-sm text-neutral-800 py-2 pl-9 pr-9 outline-none rounded-lg bg-neutral-100 w-full transition-all dark:text-white dark:bg-neutral-800 focus:ring-2 focus:ring-blue-500/40 placeholder-neutral-400 dark:placeholder-neutral-500"
            placeholder="Search models..."
          >
          <button
            v-if="searchQuery"
            class="text-neutral-400 transform transition-colors right-3 top-1/2 absolute hover:text-neutral-700 -translate-y-1/2 dark:hover:text-white"
            @click="searchQuery = ''"
          >
            <i class="i-tabler-x text-sm" />
          </button>
        </div>
      </div>

      <div class="p-3 max-h-96 overflow-y-auto">
        <!-- Loading State -->
        <div v-if="isLoading" class="text-neutral-400 p-8 text-center">
          <i class="i-tabler-loader-2 text-2xl animate-spin" />
          <p class="text-sm mt-2">
            Loading models...
          </p>
        </div>

        <!-- Error State -->
        <div v-else-if="error" class="p-6 text-center">
          <i class="i-tabler-alert-circle text-xl text-red-400" />
          <p class="text-sm text-red-400 mt-2">
            {{ error }}
          </p>
          <p class="text-xs text-neutral-400 mt-2 dark:text-neutral-500">
            Please configure your API key in the header to fetch available
            models.
          </p>
        </div>

        <!-- Models List -->
        <div v-else-if="filteredModels.length > 0" class="space-y-0.5">
          <div
            v-for="(modelOption, index) in filteredModels"
            :key="index"
            class="px-3 py-2.5 rounded-lg flex gap-3 cursor-pointer transition-colors items-center hover:bg-neutral-100 dark:hover:bg-neutral-800"
            :class="{
              'bg-neutral-100 dark:bg-neutral-800': index === highlightedIndex,
            }"
            @click="updateModel(modelOption)"
          >
            <i class="i-tabler-cube text-neutral-400 flex-shrink-0" />
            <div class="flex flex-col min-w-0">
              <span
                class="text-sm text-neutral-800 font-medium truncate dark:text-white"
              >{{ modelOption }}</span>
              <span class="text-xs text-neutral-400 dark:text-neutral-500">{{ platform }}</span>
            </div>
            <i
              v-if="modelOption === selectedModel"
              class="i-tabler-check text-blue-500 ml-auto flex-shrink-0"
            />
          </div>
        </div>

        <!-- No Models Found -->
        <div v-else class="text-neutral-400 p-6 text-center">
          <i class="i-tabler-info-circle text-xl" />
          <p class="text-sm mt-2">
            No Models Found
          </p>
        </div>
      </div>
    </div>
  </Modal>
</template>
