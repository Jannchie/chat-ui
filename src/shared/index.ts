import type { ChatData } from '../composables/useHelloWorld'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import OpenAI from 'openai'
import { useDexieStorage } from '../composables/useDexieStorage'

export const chatHistoryIDB = useIDBKeyval<ChatData[]>('chatHistory', [], {
  shallow: true,
})
export const chatHistory = computed({
  get: () => chatHistoryIDB.data.value,
  set: (value: ChatData[]) => {
    chatHistoryIDB.data.value = value
  },
})

export interface Preset {
  model: string
  serviceUrl: string
  apiKey: string
}

export const preset = useDexieStorage<Record<string, Preset>>('preset', {})
export const currentPreset = useDexieStorage('currentPreset', 'openai')
export const customServiceUrl = useDexieStorage('serviceUrl', 'https://api.openai.com/v1')
export const platform = useDexieStorage('platform', 'openai')
export const useResponsesAPI = computed(() => {
  // OpenAI 使用 responses API，其他平台使用 completions API
  return platform.value === 'openai'
})
export const serviceUrl = computed(() => {
  if (platform.value === 'custom') {
    return customServiceUrl.value
  }
  switch (platform.value) {
    case 'openai': {
      return 'https://api.openai.com/v1/'
    }
    case 'anthropic': {
      return 'https://api.anthropic.com/v1/'
    }
    case 'openrouter': {
      return 'https://openrouter.ai/api/v1/'
    }
    case 'deepseek': {
      return 'https://api.deepseek.com'
    }
    case 'pfn': {
      return 'https://api.platform.preferredai.jp/v1'
    }
    default: {
      return 'https://api.openai.com/v1/'
    }
  }
})

export const model = computed({
  get() {
    return preset.value[currentPreset.value]?.model
  },
  set(value: string) {
    preset.value = {
      ...preset.value,
      [currentPreset.value]: {
        ...(preset.value[currentPreset.value] || { model: '', serviceUrl: '', apiKey: '' }),
        model: value,
      },
    }
  },
})
export const apiKey = computed({
  get() {
    return preset.value[currentPreset.value]?.apiKey
  },
  set(value: string) {
    preset.value = {
      ...preset.value,
      [currentPreset.value]: {
        ...(preset.value[currentPreset.value] || { model: '', serviceUrl: '', apiKey: '' }),
        apiKey: value,
      },
    }
  },
})

const defaultHeaders = computed(() => {
  const headers: Record<string, string | null> = {
    'x-stainless-timeout': null,
    'x-stainless-os': null,
    'x-stainless-version': null,
    'x-stainless-package-version': null,
    'x-stainless-runtime-version': null,
    'x-stainless-runtime': null,
    'x-stainless-arch': null,
    'x-stainless-retry-count': null,
    'x-stainless-lang': null,
  }
  if (platform.value === 'anthropic') {
    headers['anthropic-dangerous-direct-browser-access'] = 'true'
    headers['x-api-key'] = apiKey.value
    headers['anthropic-version'] = '2023-06-01'
  }
  return headers
})

export const client = computed(() => {
  return new OpenAI({
    apiKey: apiKey.value,
    baseURL: serviceUrl.value,
    dangerouslyAllowBrowser: true,
    defaultHeaders: defaultHeaders.value,
  })
})

export function useCurrentChat() {
  const route = useRoute()
  const id = computed(() => {
    return route.params.id as string
  })
  return computed(() => {
    return chatHistory.value.find(chat => chat.id === id.value) ?? null
  })
}
