<script setup lang="ts">
import { useCurrency } from '../composables/useCurrency'
import { useTheme } from '../composables/useTheme'
import { chunkTimeoutSec, totalTimeoutSec } from '../shared'

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

const { selectedCurrency, exchangeRates } = useCurrency()
const { scheme, setTheme } = useTheme()

const currencyOptions = computed(() => {
  return Object.keys(exchangeRates.value)
    .filter(c => ['USD', 'JPY', 'CNY'].includes(c))
    .map(c => ({ label: c, value: c }))
})

const themeModel = computed({
  get: () => scheme.value,
  set: (value: 'auto' | 'light' | 'dark' | undefined) => {
    if (value) {
      setTheme(value)
    }
  },
})

const themeOptions = [
  { label: 'Auto', value: 'auto', icon: 'i-tabler-device-desktop' },
  { label: 'Light', value: 'light', icon: 'i-tabler-sun' },
  { label: 'Dark', value: 'dark', icon: 'i-tabler-moon' },
] as const

const totalTimeoutOptions = [
  { label: 'Off', value: 0 },
  { label: '1 min', value: 60 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
]

const chunkTimeoutOptions = [
  { label: 'Off', value: 0 },
  { label: '30s', value: 30 },
  { label: '2 min', value: 120 },
  { label: '5 min', value: 300 },
]
</script>

<template>
  <Modal v-model="showModal">
    <div
      class="mx-4 max-w-md w-full overflow-hidden border border-neutral-200 rounded-2xl bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#1a1a1a]"
    >
      <div
        class="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
      >
        <h2 class="text-base text-neutral-800 font-semibold dark:text-white">
          Settings
        </h2>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
          @click="showModal = false"
        >
          <i class="i-tabler-x" />
        </button>
      </div>

      <div class="px-5 py-4 space-y-5">
        <div class="flex items-center justify-between gap-4">
          <div class="text-sm text-neutral-800 font-medium dark:text-neutral-200">
            Theme
          </div>
          <SegmentedControl v-model="themeModel" :options="themeOptions" />
        </div>

        <div class="flex items-center justify-between gap-4">
          <div class="text-sm text-neutral-800 font-medium dark:text-neutral-200">
            Currency
          </div>
          <SegmentedControl v-model="selectedCurrency" :options="currencyOptions" />
        </div>

        <div class="border-t border-neutral-200 pt-4 space-y-4 dark:border-neutral-800">
          <div
            class="text-xs text-neutral-400 font-medium tracking-wider uppercase dark:text-neutral-500"
          >
            Request Timeout
          </div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-sm text-neutral-800 font-medium dark:text-neutral-200">
                Total duration
              </div>
              <div class="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                Abort the whole request
              </div>
            </div>
            <SegmentedControl v-model="totalTimeoutSec" :options="totalTimeoutOptions" />
          </div>
          <div class="flex items-center justify-between gap-4">
            <div>
              <div class="text-sm text-neutral-800 font-medium dark:text-neutral-200">
                Stream stall
              </div>
              <div class="mt-0.5 text-xs text-neutral-400 dark:text-neutral-500">
                No new output received
              </div>
            </div>
            <SegmentedControl v-model="chunkTimeoutSec" :options="chunkTimeoutOptions" />
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
