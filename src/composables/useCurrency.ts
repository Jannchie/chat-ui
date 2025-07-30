import { createGlobalState, useStorage } from '@vueuse/core'
import { ref } from 'vue'

function format(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 6 }).format(amount)
}

interface ExchangeRates {
  [key: string]: number
}

export const useCurrency = createGlobalState(() => {
  const exchangeRates = useStorage<ExchangeRates>('exchange-rates', { USD: 1 }, sessionStorage)
  const selectedCurrency = useStorage<string>('selected-currency', 'USD', localStorage)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const fetchExchangeRates = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await fetch('https://open.er-api.com/v6/latest/USD')
      if (!response.ok) {
        throw new Error('Failed to fetch exchange rates')
      }
      const data = await response.json()
      exchangeRates.value = data.rates
    }
    catch (error_) {
      error.value = error_ instanceof Error ? error_.message : 'An unknown error occurred'
    }
    finally {
      isLoading.value = false
    }
  }

  const convert = (amount: number, from: string, to: string) => {
    const fromRate = exchangeRates.value[from]
    const toRate = exchangeRates.value[to]
    if (fromRate && toRate) {
      return (amount / fromRate) * toRate
    }
    return null
  }

  // Fetch rates on initialization if they are not already cached in session storage
  if (Object.keys(exchangeRates.value).length <= 1) {
    fetchExchangeRates()
  }

  return {
    exchangeRates,
    selectedCurrency,
    isLoading,
    error,
    fetchExchangeRates,
    convert,
    format,
  }
})
