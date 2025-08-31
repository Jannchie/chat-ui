import { ref } from 'vue'
import { streamText } from 'ai'
import { getProviderFromPlatform } from '../lib/ai-providers'
import { apiKey, model, platform, serviceUrl } from '../shared'

export interface PromptOptimizationOptions {
  style?: 'professional' | 'casual' | 'concise' | 'detailed'
  purpose?: 'general' | 'coding' | 'creative' | 'analysis'
  language?: string
}

export function usePromptOptimizer() {
  const isOptimizing = ref(false)
  const optimizationError = ref<string | null>(null)

  const optimizePrompt = async (
    originalPrompt: string,
    options: PromptOptimizationOptions = {},
  ): Promise<string | null> => {
    if (!originalPrompt.trim()) {
      return null
    }

    isOptimizing.value = true
    optimizationError.value = null

    try {
      const { style = 'professional', purpose = 'general', language = 'auto-detect' } = options

      const systemMessage = `You are a prompt optimization expert. Your task is to improve the user's prompt to be more effective, clear, and specific while maintaining the original intent.

Guidelines:
- Style: ${style}
- Purpose: ${purpose}
- Language: ${language === 'auto-detect' ? 'Keep the same language as the input' : language}
- Make the prompt more specific and actionable
- Remove ambiguity while preserving the core request
- Add context if beneficial
- Keep it concise yet comprehensive

Return only the optimized prompt without any explanations or additional text.`

      const userMessage = `Original prompt: "${originalPrompt}"`

      const provider = getProviderFromPlatform(platform.value, apiKey.value, serviceUrl.value)
      const languageModel = provider.getModel(model.value)

      const result = await streamText({
        model: languageModel,
        messages: [
          {
            role: 'system',
            content: systemMessage,
          },
          {
            role: 'user',
            content: userMessage,
          },
        ],
        temperature: 0.3,
        maxRetries: 1,
      })

      let optimizedContent = ''
      for await (const textPart of result.textStream) {
        optimizedContent += textPart
      }

      return optimizedContent?.trim() || null
    }
    catch (error) {
      console.error('Prompt optimization failed:', error)
      optimizationError.value = error instanceof Error ? error.message : 'Optimization failed'
      return null
    }
    finally {
      isOptimizing.value = false
    }
  }

  return {
    isOptimizing: readonly(isOptimizing),
    optimizationError: readonly(optimizationError),
    optimizePrompt,
  }
}
