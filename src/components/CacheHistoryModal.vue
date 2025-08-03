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
</script>

<template>
  <Modal v-model="showModal">
    <div class="rounded-lg bg-neutral-100 max-h-[80vh] max-w-2xl w-full shadow-xl overflow-hidden dark:bg-[#1a1a1a]">
      <div class="p-4 border-b border-neutral-700 flex items-center justify-between">
        <h2 class="text-xl text-neutral-800 font-semibold dark:text-white">
          Cache History
        </h2>
        <div class="flex gap-2 items-center">
          <div class="p-1 rounded-lg bg-neutral-200 flex dark:bg-neutral-800">
            <button
              :class="displayMode === 'recent' ? 'text-white bg-neutral-500 dark:bg-neutral-600' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'"
              class="text-sm px-3 py-1 rounded transition-colors"
              @click="displayMode = 'recent'"
            >
              Recent
            </button>
            <button
              :class="displayMode === 'frequent' ? 'text-white bg-neutral-500 dark:bg-neutral-600' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'"
              class="text-sm px-3 py-1 rounded transition-colors"
              @click="displayMode = 'frequent'"
            >
              Frequent
            </button>
          </div>
          <button
            class="leading-0 rounded-full h-9 w-9 hover:bg-neutral-200 dark:hover:bg-neutral-700"
            @click="showModal = false"
          >
            <i class="i-tabler-x text-neutral-600 dark:text-white" />
          </button>
        </div>
      </div>

      <div class="max-h-[60vh] overflow-y-auto">
        <div v-if="loading" class="p-8 flex items-center justify-center">
          <div class="text-neutral-400">
            Loading...
          </div>
        </div>
        <div v-else-if="cacheEntries.length === 0" class="p-8 flex items-center justify-center">
          <div class="text-neutral-400">
            No cache entries found
          </div>
        </div>
        <div v-else class="divide-neutral-700 divide-y">
          <div
            v-for="entry in cacheEntries"
            :key="entry.id"
            class="p-4 cursor-pointer transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
            @click="applyConfiguration(entry)"
          >
            <div class="flex items-center justify-between">
              <div class="flex-1">
                <div class="flex gap-2 items-center">
                  <div class="text-neutral-800 font-medium dark:text-white">
                    {{ getDisplayName(entry) }}
                  </div>
                  <div class="text-xs text-neutral-400 flex gap-1 items-center">
                    <i class="i-tabler-mouse" />
                    {{ entry.accessCount }}
                  </div>
                </div>
                <div class="text-sm text-neutral-400 mt-1">
                  API Key: {{ getMaskedApiKey(entry.key.apiKey) }}
                </div>
                <div class="text-xs text-neutral-500 mt-1">
                  {{ formatDate(entry.timestamp) }}
                </div>
              </div>
              <div class="text-neutral-400 flex items-center">
                <i class="i-tabler-arrow-right" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
