<script setup lang="ts">
import type { RequestCacheEntry } from '../composables/useDatabase'
import { useRequestCache } from '../composables/useRequestCache'
import { currentPreset, customServiceUrl, model, platform } from '../shared'

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
  // model 的 setter 写向 preset[currentPreset]，必须先切换 currentPreset
  platform.value = config.preset
  currentPreset.value = config.preset

  // Handle custom service URL
  if (config.preset === 'custom') {
    customServiceUrl.value = config.serviceUrl
  }

  model.value = config.model
  // API key 不再存入缓存（只存脱敏前缀）；切换 preset 后使用该 preset 已保存的 key
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
      class="mx-4 max-h-[80vh] max-w-2xl w-full overflow-hidden border border-neutral-200 rounded-2xl bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#1a1a1a]"
    >
      <div
        class="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
      >
        <h2 class="text-base text-neutral-800 font-semibold dark:text-white">
          Cache History
        </h2>
        <div class="flex items-center gap-3">
          <SegmentedControl v-model="displayMode" :options="displayModeOptions" />
          <button
            class="h-8 w-8 flex items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
            @click="showModal = false"
          >
            <i class="i-tabler-x" />
          </button>
        </div>
      </div>

      <div class="max-h-[60vh] overflow-y-auto p-3">
        <div v-if="loading" class="p-8 text-center text-sm text-neutral-400">
          Loading...
        </div>
        <div
          v-else-if="cacheEntries.length === 0"
          class="p-8 text-center"
        >
          <i class="i-tabler-database-off text-xl text-neutral-300 dark:text-neutral-600" />
          <p class="mt-2 text-sm text-neutral-400">
            No cache entries found
          </p>
        </div>
        <div v-else class="space-y-0.5">
          <div
            v-for="entry in cacheEntries"
            :key="entry.id"
            class="group flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
            @click="applyConfiguration(entry)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex items-center gap-2">
                <div class="truncate text-sm text-neutral-800 font-medium dark:text-white">
                  {{ getDisplayName(entry) }}
                </div>
                <div
                  class="flex flex-shrink-0 items-center gap-1 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                >
                  <i class="i-tabler-mouse" />
                  {{ entry.accessCount }}
                </div>
              </div>
              <div class="mt-1 flex gap-3 text-xs text-neutral-400 dark:text-neutral-500">
                <span>{{ getMaskedApiKey(entry.key.apiKey) }}</span>
                <span>{{ formatDate(entry.timestamp) }}</span>
              </div>
            </div>
            <i
              class="i-tabler-arrow-right flex-shrink-0 text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100"
            />
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
