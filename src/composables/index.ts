import { apiKey, client, currentPreset, platform, preset } from '../shared'

export function useModels() {
  const models = ref<string[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 跟踪上次请求的状态，避免重复请求
  const lastRequestKey = ref('')

  async function fetchModels() {
    if (!apiKey.value) {
      models.value = []
      error.value = 'API Key is required to fetch models'
      return
    }

    // 生成当前请求的唯一标识
    const currentRequestKey = `${platform.value}:${apiKey.value}`

    // 如果请求参数没有变化，跳过请求
    if (lastRequestKey.value === currentRequestKey && models.value.length > 0) {
      return
    }

    lastRequestKey.value = currentRequestKey
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
      // 请求失败时重置标识，允许重试
      lastRequestKey.value = ''
    }
    finally {
      isLoading.value = false
    }
  }

  // 等待关键状态加载完成后再开始监听
  const allStatesLoaded = computed(() => {
    return platform.isLoaded.value && preset.isLoaded.value && currentPreset.isLoaded.value
  })

  // 使用 watchEffect 来统一监听所有相关状态变化
  watchEffect(() => {
    // 只有在所有关键状态都加载完成后才开始处理
    if (!allStatesLoaded.value) {
      return
    }

    // 只有当 platform 和 apiKey 都有值时才尝试获取模型
    if (platform.value && apiKey.value) {
      fetchModels()
    }
    else {
      // 如果关键状态缺失，清空模型列表
      models.value = []
      error.value = apiKey.value ? null : 'API Key is required to fetch models'
      lastRequestKey.value = ''
    }
  })

  // 用于手动切换时立即更新的 watcher
  watch([platform], () => {
    // 只有在状态加载完成后的切换才清空模型列表（提供即时反馈）
    if (allStatesLoaded.value) {
      models.value = []
      error.value = null
    }
  })

  return {
    models: readonly(models),
    isLoading: readonly(isLoading),
    error: readonly(error),
    fetchModels: () => {
      // 强制刷新时重置标识
      lastRequestKey.value = ''
      fetchModels()
    },
  }
}
