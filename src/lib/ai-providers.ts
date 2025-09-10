import type { LanguageModel } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'

export interface ProviderConfig {
  apiKey: string
  baseURL?: string
  model?: string
}

export interface AIProvider {
  name: string
  models: LanguageModel[]
  getModel: (modelId: string) => LanguageModel
}

export function createAIProvider(platform: string, config: ProviderConfig): AIProvider {
  switch (platform) {
    case 'openai': {
      const openai = createOpenAI({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })

      return {
        name: 'OpenAI',
        models: [],
        getModel: (modelId: string) => openai(modelId),
      }
    }

    case 'anthropic': {
      const anthropic = createAnthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
      })

      return {
        name: 'Anthropic',
        models: [],
        getModel: (modelId: string) => anthropic(modelId),
      }
    }

    case 'openrouter': {
      const openrouter = createOpenAICompatible({
        name: 'openrouter',
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
        headers: {
          'HTTP-Referer': globalThis.location.origin,
          'X-Title': 'Chat UI',
        },
      })

      return {
        name: 'OpenRouter',
        models: [],
        getModel: (modelId: string) => openrouter(modelId),
      }
    }

    case 'deepseek': {
      const deepseek = createOpenAICompatible({
        name: 'deepseek',
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.deepseek.com',
      })

      return {
        name: 'DeepSeek',
        models: [],
        getModel: (modelId: string) => deepseek(modelId),
      }
    }

    case 'pfn': {
      const pfn = createOpenAICompatible({
        name: 'pfn',
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.platform.preferredai.jp/v1',
      })

      return {
        name: 'PFN',
        models: [],
        getModel: (modelId: string) => pfn(modelId),
      }
    }

    case 'zhipu': {
      const zhipu = createOpenAICompatible({
        name: 'zhipu',
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.z.ai/api/paas/v4/',
      })

      return {
        name: 'Zhipu AI',
        models: [],
        getModel: (modelId: string) => zhipu(modelId),
      }
    }

    case 'custom': {
      const custom = createOpenAICompatible({
        name: 'custom',
        apiKey: config.apiKey,
        baseURL: config.baseURL || 'https://api.openai.com/v1',
      })

      return {
        name: 'Custom',
        models: [],
        getModel: (modelId: string) => custom(modelId),
      }
    }

    default: {
      throw new Error(`Unsupported platform: ${platform}`)
    }
  }
}

export function getProviderFromPlatform(
  platform: string,
  apiKey: string,
  serviceUrl?: string,
): AIProvider {
  const config: ProviderConfig = {
    apiKey,
    baseURL: serviceUrl || undefined,
  }

  return createAIProvider(platform, config)
}
