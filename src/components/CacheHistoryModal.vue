<script setup lang="ts">
import type { RequestCacheEntry } from '../composables/useDatabase'
import { Modal } from '@roku-ui/vue'
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

const { getRecentSuccessfulRequests, getTopSuccessfulRequests }
  = useRequestCache()

const cacheEntries = ref<RequestCacheEntry[]>([])
const displayMode = ref<'recent' | 'frequent'>('recent')
const loading = ref(false)

const displayModeOptions = [
  { label: 'Recent', value: 'recent' },
  { label: 'Frequent', value: 'frequent' },
] as const

async function loadCacheEntries() {
  loading.value = true
  try {
    cacheEntries.value = await (displayMode.value === 'recent'
      ? getRecentSuccessfulRequests(10)
      : getTopSuccessfulRequests(10))
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
</script>

<template>
  <Modal v-model="showModal">
    <div
      class="mx-4 border border-neutral-200 rounded-2xl bg-white max-h-[80vh] max-w-2xl w-full shadow-2xl overflow-hidden dark:border-neutral-800 dark:bg-[#1a1a1a]"
    >
      <div
        class="px-5 py-4 border-b border-neutral-200 flex items-center justify-between dark:border-neutral-800"
      >
        <h2 class="text-base text-neutral-800 font-semibold dark:text-white">
          Cache History
        </h2>
        <div class="flex gap-3 items-center">
          <SegmentedControl v-model="displayMode" :options="displayModeOptions" />
          <button
            class="text-neutral-400 rounded-full flex h-8 w-8 transition-colors items-center justify-center hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-white dark:hover:bg-neutral-800"
            @click="showModal = false"
          >
            <i class="i-tabler-x" />
          </button>
        </div>
      </div>

      <div class="p-3 max-h-[60vh] overflow-y-auto">
        <div v-if="loading" class="text-sm text-neutral-400 p-8 text-center">
          Loading...
        </div>
        <div
          v-else-if="cacheEntries.length === 0"
          class="p-8 text-center"
        >
          <i class="i-tabler-database-off text-xl text-neutral-300 dark:text-neutral-600" />
          <p class="text-sm text-neutral-400 mt-2">
            No cache entries found
          </p>
        </div>
        <div v-else class="space-y-0.5">
          <div
            v-for="entry in cacheEntries"
            :key="entry.id"
            class="group px-3 py-2.5 rounded-lg flex gap-3 cursor-pointer transition-colors items-center hover:bg-neutral-100 dark:hover:bg-neutral-800"
            @click="applyConfiguration(entry)"
          >
            <div class="flex-1 min-w-0">
              <div class="flex gap-2 items-center">
                <div class="text-sm text-neutral-800 font-medium truncate dark:text-white">
                  {{ getDisplayName(entry) }}
                </div>
                <div
                  class="text-xs text-neutral-400 px-1.5 py-0.5 rounded bg-neutral-100 flex flex-shrink-0 gap-1 items-center dark:text-neutral-500 dark:bg-neutral-800"
                >
                  <i class="i-tabler-mouse" />
                  {{ entry.accessCount }}
                </div>
              </div>
              <div class="text-xs text-neutral-400 mt-1 flex gap-3 dark:text-neutral-500">
                <span>{{ getMaskedApiKey(entry.key.apiKey) }}</span>
                <span>{{ formatDate(entry.timestamp) }}</span>
              </div>
            </div>
            <i
              class="i-tabler-arrow-right text-neutral-400 opacity-0 flex-shrink-0 transition-opacity group-hover:opacity-100"
            />
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
