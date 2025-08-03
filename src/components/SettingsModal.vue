<script setup lang="ts">
import { Modal } from '@roku-ui/vue'
import { useCurrency } from '../composables/useCurrency'
import { useTheme } from '../composables/useTheme'

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

const availableCurrencies = computed(() => {
  return Object.keys(exchangeRates.value).filter(c => ['USD', 'JPY', 'CNY'].includes(c))
})

function selectCurrency(currency: string) {
  selectedCurrency.value = currency
}

const themes: Array<'auto' | 'light' | 'dark'> = ['auto', 'light', 'dark']
</script>

<template>
  <Modal v-model="showModal">
    <div class="rounded-lg bg-neutral-100 max-w-md w-full shadow-xl overflow-hidden dark:bg-[#1a1a1a]">
      <div class="p-4 border-b border-neutral-300 flex items-center justify-between dark:border-neutral-700">
        <h2 class="text-xl text-neutral-800 font-semibold dark:text-white">
          Settings
        </h2>
        <button
          class="leading-0 rounded-full h-9 w-9 hover:bg-neutral-200 dark:hover:bg-neutral-700"
          @click="showModal = false"
        >
          <i class="i-tabler-x text-neutral-600 dark:text-white" />
        </button>
      </div>
      <div class="p-4 space-y-4">
        <div>
          <h3 class="text-lg text-neutral-800 font-medium mb-2 dark:text-white">
            Theme
          </h3>
          <div class="flex gap-2">
            <button
              v-for="theme in themes"
              :key="theme"
              :class="scheme === theme ? 'text-white bg-neutral-500 dark:bg-neutral-600' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'"
              class="text-sm px-3 py-1 rounded transition-colors"
              @click="setTheme(theme)"
            >
              {{ theme }}
            </button>
          </div>
        </div>
        <div>
          <h3 class="text-lg text-neutral-800 font-medium mb-2 dark:text-white">
            Currency
          </h3>
          <div class="flex gap-2">
            <button
              v-for="currency in availableCurrencies"
              :key="currency"
              :class="selectedCurrency === currency ? 'text-white bg-neutral-500 dark:bg-neutral-600' : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-white'"
              class="text-sm px-3 py-1 rounded transition-colors"
              @click="selectCurrency(currency)"
            >
              {{ currency }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Modal>
</template>
