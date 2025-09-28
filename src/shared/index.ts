import type { ChatData } from '../composables/chat-types'
import type { ReasoningEffort } from '../types/ai'
import { useIDBKeyval } from '@vueuse/integrations/useIDBKeyval'
import { useDexieStorage } from '../composables/useDexieStorage'

export type { ReasoningEffort } from '../types/ai'

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
export const openaiReasoningEffort = useDexieStorage<ReasoningEffort>('openaiReasoningEffort', 'normal')

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
    case 'zhipu': {
      return 'https://api.z.ai/api/paas/v4/'
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

export function useCurrentChat() {
  const route = useRoute()
  const id = computed(() => {
    return route.params.id as string
  })
  return computed(() => {
    return chatHistory.value.find(chat => chat.id === id.value) ?? null
  })
}
