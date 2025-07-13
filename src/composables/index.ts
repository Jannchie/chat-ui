import { apiKey, client, platform } from '../shared'

export function useClient() {
  return client
}

export function useModels() {
  const models = ref<string[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  async function fetchModels() {
    if (!apiKey.value) {
      models.value = []
      error.value = 'API Key is required to fetch models'
      return
    }

    isLoading.value = true
    error.value = null
    try {
      const response = await client.value.models.list()
      models.value = response.data.map(d => d.id)
    }
    catch (error_) {
      console.error(error_)
      error.value = 'Failed to fetch models'
      models.value = []
    }
    finally {
      isLoading.value = false
    }
  }

  onMounted(() => {
    fetchModels()
  })

  // Watch platform changes - immediately clear models and fetch new ones
  watch(platform, () => {
    models.value = []
    error.value = null
    fetchModels()
  })

  // Watch API key changes - fetch models when key is added
  watch(apiKey, () => {
    fetchModels()
  })

  return {
    models: readonly(models),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchModels,
  }
}
