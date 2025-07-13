<script setup lang="ts">
import { Btn } from '@roku-ui/vue'
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
const modalRef = ref<HTMLElement | null>(null)
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
watch([searchQuery], () => {
  highlightedIndex.value = -1
})

function handleKeyDown(event: KeyboardEvent) {
  // Only handle keyboard events when modal is actually open
  if (!modelValue.value) {
    return
  }

  switch (event.key) {
    case 'Escape': {
      closeModal()
      break
    }
    case 'ArrowDown': {
      event.preventDefault()
      highlightedIndex.value = (highlightedIndex.value + 1) % filteredModels.value.length
      break
    }
    case 'ArrowUp': {
      event.preventDefault()
      highlightedIndex.value = (highlightedIndex.value - 1 + filteredModels.value.length) % filteredModels.value.length
      break
    }
    case 'Enter': {
      if (highlightedIndex.value >= 0) {
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

// Only listen to keyboard events when modal is open
watch(modelValue, (isOpen) => {
  if (isOpen) {
    globalThis.addEventListener('keydown', handleKeyDown)
  }
  else {
    globalThis.removeEventListener('keydown', handleKeyDown)
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
  searchQuery.value = ''
  highlightedIndex.value = -1
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
      enter-active-class="transition ease-out"
      leave-active-class="transition ease-in"
    >
      <div
        v-if="modelValue"
        ref="modalRef"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="closeModal"
      >
        <div class="absolute top-10rem mx-4 max-w-md w-full overflow-hidden rounded-xl bg-[#1a1a1a] shadow-lg">
          <div class="flex items-center justify-between border-b border-neutral-800 p-4">
            <h3 class="text-lg text-white font-medium">
              Select Model
            </h3>
            <Btn
              icon
              rounded="full"
              color="white"
              variant="transparent"
              hover-variant="light"
              @click="closeModal"
            >
              <i class="i-tabler-x text-xl" />
            </Btn>
          </div>

          <!-- Search bar -->
          <div class="border-b border-neutral-800 p-4">
            <div class="relative">
              <i class="i-tabler-search absolute left-3 top-1/2 transform text-neutral-400 -translate-y-1/2" />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                class="w-full rounded-lg bg-neutral-800 p-2 pl-10 pr-8 text-white outline-none transition-colors focus:bg-neutral-700 focus:ring-2 focus:ring-neutral-600 placeholder-neutral-500"
                placeholder="Search models..."
              >
              <button
                v-if="searchQuery"
                class="absolute right-3 top-1/2 transform text-neutral-400 transition-colors -translate-y-1/2 hover:text-white"
                @click="searchQuery = ''"
              >
                <i class="i-tabler-x text-sm" />
              </button>
            </div>
          </div>

          <div class="max-h-96 overflow-y-auto p-2">
            <!-- Loading State -->
            <div
              v-if="isLoading"
              class="p-8 text-center text-neutral-400"
            >
              <i class="i-tabler-loader-2 animate-spin text-2xl" />
              <p class="mt-2">
                Loading models...
              </p>
            </div>

            <!-- Error State -->
            <div
              v-else-if="error"
              class="p-4 text-center text-neutral-400"
            >
              <i class="i-tabler-alert-circle text-xl text-red-400" />
              <p class="mt-2 text-red-400">
                {{ error }}
              </p>
              <p class="mt-2 text-sm text-neutral-500">
                Please configure your API key in the header to fetch available models.
              </p>
            </div>

            <!-- Models List -->
            <div v-else-if="filteredModels.length > 0">
              <div
                v-for="(modelOption, index) in filteredModels"
                :key="index"
                class="mb-1 flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-colors hover:bg-neutral-800"
                :class="{ 'bg-neutral-800': modelOption === selectedModel || index === highlightedIndex }"
                @click="updateModel(modelOption)"
              >
                <div class="h-8 w-8 flex flex-shrink-0 items-center justify-center rounded-full bg-neutral-800">
                  <i class="i-tabler-cube text-purple-400" />
                </div>
                <div class="flex flex-col">
                  <span class="truncate text-sm text-white font-medium">{{ modelOption }}</span>
                  <span class="text-xs text-neutral-400">{{ platform }}</span>
                </div>
                <div class="ml-auto flex-shrink-0">
                  <i
                    v-if="modelOption === selectedModel"
                    class="i-tabler-check text-neutral-400"
                  />
                </div>
              </div>
            </div>

            <!-- No Models Found -->
            <div
              v-else
              class="p-4 text-center text-neutral-400"
            >
              <i class="i-tabler-info-circle text-xl" />
              <p class="mt-2">
                No Models Found
              </p>
            </div>
          </div>

          <div class="flex justify-end border-t border-neutral-800 p-4">
            <button
              class="rounded-lg bg-neutral-700 px-4 py-2 text-sm text-white font-medium transition-colors hover:bg-neutral-600"
              @click="closeModal"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
