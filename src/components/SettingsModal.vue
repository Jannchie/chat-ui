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
    <div class="rounded-lg bg-[#1a1a1a] max-w-md w-full shadow-xl overflow-hidden">
      <div class="p-4 border-b border-neutral-700 flex items-center justify-between">
        <h2 class="text-xl text-white font-semibold">
          Settings
        </h2>
        <button
          class="leading-0 rounded-full h-9 w-9 hover:bg-neutral-700"
          @click="showModal = false"
        >
          <i class="i-tabler-x text-white" />
        </button>
      </div>
      <div class="p-4 space-y-4">
        <div>
          <h3 class="text-lg text-white font-medium mb-2">Theme</h3>
          <div class="flex gap-2">
            <button
              v-for="theme in themes"
              :key="theme"
              :class="scheme === theme ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-white'"
              class="text-sm px-3 py-1 rounded transition-colors"
              @click="setTheme(theme)"
            >
              {{ theme }}
            </button>
          </div>
        </div>
        <div>
          <h3 class="text-lg text-white font-medium mb-2">Currency</h3>
          <div class="flex gap-2">
            <button
              v-for="currency in availableCurrencies"
              :key="currency"
              :class="selectedCurrency === currency ? 'bg-neutral-600 text-white' : 'text-neutral-400 hover:text-white'"
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