<script setup lang="ts">
import type { RequestCacheEntry } from '../composables/useDatabase'
import { useRequestCache } from '../composables/useRequestCache'
import { apiKey, customServiceUrl, model, platform } from '../shared'

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const showModal = computed({
  get: () => props.modelValue,
  set: (value: boolean) => emit('update:modelValue', value),
})

const { getRecentSuccessfulRequests, getTopSuccessfulRequests } = useRequestCache()

const cacheEntries = ref<RequestCacheEntry[]>([])
const displayMode = ref<'recent' | 'frequent'>('recent')
const loading = ref(false)

async function loadCacheEntries() {
  loading.value = true
  try {
    cacheEntries.value = await (displayMode.value === 'recent' ? getRecentSuccessfulRequests(10) : getTopSuccessfulRequests(10))
  }
  catch (error) {
    console.error('Error loading cache entries:', error)
  }
  finally {
    loading.value = false
  }
}

function applyConfiguration(entry: RequestCacheEntry) {
  const config = entry.key
  platform.value = config.preset

  // Handle custom service URL
  if (config.preset === 'custom') {
    customServiceUrl.value = config.serviceUrl
  }

  model.value = config.model
  apiKey.value = config.apiKey
  showModal.value = false
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString()
}

function getDisplayName(entry: RequestCacheEntry) {
  const config = entry.key
  return `${config.preset} - ${config.model}`
}

function getMaskedApiKey(key: string) {
  return key.length > 8 ? `${key.slice(0, 8)}...` : key
}

watch(showModal, (value) => {
  if (value) {
    loadCacheEntries()
  }
})

watch(displayMode, () => {
  if (showModal.value) {
    loadCacheEntries()
  }
})

// Handle ESC key to close modal
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showModal.value) {
    showModal.value = false
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div
    v-if="showModal"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="showModal = false"
  >
    <div class="max-h-[80vh] max-w-2xl w-full overflow-hidden rounded-lg bg-[#1a1a1a] shadow-xl">
      <div class="flex items-center justify-between border-b border-neutral-700 p-4">
        <h2 class="text-xl text-white font-semibold">
          Cache History
        </h2>
        <div class="flex items-center gap-2">
          <div class="flex rounded-lg bg-neutral-800 p-1">
            <button
              :class="displayMode === 'recent' ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-white'"
              class="rounded px-3 py-1 text-sm transition-colors"
              @click="displayMode = 'recent'"
            >
              Recent
            </button>
            <button
              :class="displayMode === 'frequent' ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-white'"
              class="rounded px-3 py-1 text-sm transition-colors"
              @click="displayMode = 'frequent'"
            >
              Frequent
            </button>
          </div>
          <button
            class="h-9 w-9 rounded-full leading-0 hover:bg-neutral-700"
            @click="showModal = false"
          >
            <i class="i-tabler-x text-white" />
          </button>
        </div>
      </div>

      <div class="max-h-[60vh] overflow-y-auto">
        <div v-if="loading" class="flex items-center justify-center p-8">
          <div class="text-neutral-400">
            Loading...
          </div>
        </div>
        <div v-else-if="cacheEntries.length === 0" class="flex items-center justify-center p-8">
          <div class="text-neutral-400">
            No cache entries found
          </div>
        </div>
        <div v-else class="divide-y divide-neutral-700">
          <div
            v-for="entry in cacheEntries"
            :key="entry.id"
            class="cursor-pointer p-4 transition-colors hover:bg-neutral-800"
            @click="applyConfiguration(entry)"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex items-center gap-2">
                  <div class="text-white font-medium">
                    {{ getDisplayName(entry) }}
                  </div>
                  <div class="flex items-center gap-1 text-xs text-neutral-400">
                    <i class="i-tabler-mouse" />
                    {{ entry.accessCount }}
                  </div>
                </div>
                <div class="mt-1 text-sm text-neutral-400">
                  API Key: {{ getMaskedApiKey(entry.key.apiKey) }}
                </div>
                <div class="mt-1 text-xs text-neutral-500">
                  {{ formatDate(entry.timestamp) }}
                </div>
              </div>
              <div class="flex items-center text-neutral-400">
                <i class="i-tabler-arrow-right" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
