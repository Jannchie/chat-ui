import type OpenAI from 'openai'
import { ref } from 'vue'
import { client, model, useResponsesAPI } from '../shared'

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

      let optimizedContent: string | null = null

      if (useResponsesAPI.value) {
        const response = await (client.value as any).responses.create({
          model: model.value,
          input: [
            {
              role: 'system',
              content: systemMessage,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ],
        })
        optimizedContent = response.output_text
      }
      else {
        const response = await client.value.chat.completions.create({
          model: model.value,
          messages: [
            {
              role: 'system',
              content: systemMessage,
            },
            {
              role: 'user',
              content: userMessage,
            },
          ] as OpenAI.Chat.Completions.ChatCompletionMessageParam[],
          temperature: 0.3,
          max_tokens: 1000,
        })
        optimizedContent = response.choices[0]?.message?.content
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
