import { apiKey, currentPreset, platform, preset, serviceUrl } from '../shared'

async function fetchModelsFromAPI(platformName: string, key: string): Promise<string[]> {
  const baseUrl = getAPIBaseURL(platformName)
  
  try {
    switch (platformName) {
      case 'openai':
      case 'deepseek':
      case 'pfn':
      case 'custom': {
        const response = await fetch(`${baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        return data.data?.map((model: any) => model.id) || []
      }
      
      case 'anthropic': {
        // Anthropic doesn't have a public models API, return known models
        return [
          'claude-3-5-sonnet-20241022',
          'claude-3-5-haiku-20241022', 
          'claude-3-haiku-20240307',
          'claude-3-opus-20240229'
        ]
      }
      
      case 'openrouter': {
        const response = await fetch('https://openrouter.ai/api/v1/models', {
          headers: {
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        return data.data?.map((model: any) => model.id) || []
      }
      
      default:
        return []
    }
  }
  catch (error) {
    throw error
  }
}

function getAPIBaseURL(platformName: string): string {
  switch (platformName) {
    case 'openai':
      return 'https://api.openai.com/v1'
    case 'anthropic':
      return 'https://api.anthropic.com/v1'
    case 'openrouter':
      return 'https://openrouter.ai/api/v1'
    case 'deepseek':
      return 'https://api.deepseek.com/v1'
    case 'pfn':
      return 'https://api.platform.preferredai.jp/v1'
    case 'custom':
      return serviceUrl.value.replace(/\/$/, '') // Remove trailing slash
    default:
      return ''
  }
}

export function useModels() {
  const models = ref<string[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  // 跟踪上次请求的状态，避免重复请求
  const lastRequestKey = ref('')

  async function fetchModels() {
    if (!platform.value) {
      models.value = []
      error.value = 'Please select a platform first'
      return
    }

    // 生成当前请求的唯一标识
    const currentRequestKey = `${platform.value}:${apiKey.value || 'no-key'}`

    // 如果请求参数没有变化，跳过请求
    if (lastRequestKey.value === currentRequestKey && models.value.length > 0) {
      return
    }

    lastRequestKey.value = currentRequestKey
    isLoading.value = true
    error.value = null

    try {
      if (!apiKey.value) {
        // If no API key, provide default models for preview
        switch (platform.value) {
          case 'openai':
            models.value = ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo']
            break
          case 'anthropic':
            models.value = ['claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307', 'claude-3-opus-20240229']
            break
          case 'openrouter':
            models.value = ['openai/gpt-4', 'anthropic/claude-3-sonnet', 'google/gemini-pro']
            break
          case 'deepseek':
            models.value = ['deepseek-chat', 'deepseek-coder']
            break
          case 'pfn':
            models.value = ['plamo-beta']
            break
          default:
            models.value = []
        }
        error.value = 'Enter API key to fetch real models'
        return
      }

      // Fetch real models from API
      const response = await fetchModelsFromAPI(platform.value, apiKey.value)
      models.value = response
      error.value = null
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

    // 只有当 platform 有值时就尝试获取模型（不需要 API Key）
    if (platform.value) {
      fetchModels()
    }
    else {
      // 如果平台未选择，清空模型列表
      models.value = []
      error.value = 'Please select a platform first'
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
