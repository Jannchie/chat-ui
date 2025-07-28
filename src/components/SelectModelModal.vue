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
        class="bg-black/50 flex items-center inset-0 justify-center fixed z-50"
        @click.self="closeModal"
      >
        <div class="mx-4 rounded-xl bg-[#1a1a1a] max-w-md w-full shadow-lg top-10rem absolute overflow-hidden">
          <div class="p-4 border-b border-neutral-800 flex items-center justify-between">
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
          <div class="p-4 border-b border-neutral-800">
            <div class="relative">
              <i class="i-tabler-search text-neutral-400 transform left-3 top-1/2 absolute -translate-y-1/2" />
              <input
                ref="searchInputRef"
                v-model="searchQuery"
                type="text"
                class="text-white p-2 pl-10 pr-8 outline-none rounded-lg bg-neutral-800 w-full transition-colors focus:bg-neutral-700 focus:ring-2 focus:ring-neutral-600 placeholder-neutral-500"
                placeholder="Search models..."
              >
              <button
                v-if="searchQuery"
                class="text-neutral-400 transform transition-colors right-3 top-1/2 absolute hover:text-white -translate-y-1/2"
                @click="searchQuery = ''"
              >
                <i class="i-tabler-x text-sm" />
              </button>
            </div>
          </div>

          <div class="p-2 max-h-96 overflow-y-auto">
            <!-- Loading State -->
            <div
              v-if="isLoading"
              class="text-neutral-400 p-8 text-center"
            >
              <i class="i-tabler-loader-2 text-2xl animate-spin" />
              <p class="mt-2">
                Loading models...
              </p>
            </div>

            <!-- Error State -->
            <div
              v-else-if="error"
              class="text-neutral-400 p-4 text-center"
            >
              <i class="i-tabler-alert-circle text-xl text-red-400" />
              <p class="text-red-400 mt-2">
                {{ error }}
              </p>
              <p class="text-sm text-neutral-500 mt-2">
                Please configure your API key in the header to fetch available models.
              </p>
            </div>

            <!-- Models List -->
            <div v-else-if="filteredModels.length > 0">
              <div
                v-for="(modelOption, index) in filteredModels"
                :key="index"
                class="mb-1 p-3 rounded-lg flex gap-3 cursor-pointer transition-colors items-center hover:bg-neutral-800"
                :class="{ 'bg-neutral-800': modelOption === selectedModel || index === highlightedIndex }"
                @click="updateModel(modelOption)"
              >
                <div class="rounded-full bg-neutral-800 flex flex-shrink-0 h-8 w-8 items-center justify-center">
                  <i class="i-tabler-cube text-purple-400" />
                </div>
                <div class="flex flex-col">
                  <span class="text-sm text-white font-medium truncate">{{ modelOption }}</span>
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
              class="text-neutral-400 p-4 text-center"
            >
              <i class="i-tabler-info-circle text-xl" />
              <p class="mt-2">
                No Models Found
              </p>
            </div>
          </div>

          <div class="p-4 border-t border-neutral-800 flex justify-end">
            <button
              class="text-sm text-white font-medium px-4 py-2 rounded-lg bg-neutral-700 transition-colors hover:bg-neutral-600"
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
