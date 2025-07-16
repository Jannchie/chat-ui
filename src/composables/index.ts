import { apiKey, client, platform } from '../shared'

export function useModels() {
  const models = ref<string[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 用于防抖的 timeout ID
  let fetchTimeout: NodeJS.Timeout | null = null

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

  // 防抖的 fetchModels 函数
  function debouncedFetchModels(immediate = false) {
    if (fetchTimeout) {
      clearTimeout(fetchTimeout)
    }

    if (immediate) {
      fetchModels()
    }
    else {
      fetchTimeout = setTimeout(() => {
        fetchModels()
      }, 300) // 300ms 防抖延迟
    }
  }

  onMounted(() => {
    // 延迟执行，等待状态稳定
    debouncedFetchModels()
  })

  // Watch platform changes - immediately clear models and fetch new ones
  watch(platform, () => {
    models.value = []
    error.value = null
    debouncedFetchModels()
  })

  // Watch API key changes - fetch models when key is added
  watch(apiKey, () => {
    debouncedFetchModels()
  })

  // 清理定时器
  onUnmounted(() => {
    if (fetchTimeout) {
      clearTimeout(fetchTimeout)
    }
  })

  return {
    models: readonly(models),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchModels: () => debouncedFetchModels(true),
  }
}
