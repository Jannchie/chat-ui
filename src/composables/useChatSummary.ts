import { streamText } from 'ai'
import { getProviderFromPlatform } from '../lib/ai-providers'
import { apiKey, model, platform, serviceUrl } from '../shared'
import { useRequestCache } from './useRequestCache'

export function useChatSummary() {
  const { cacheSuccessfulRequest } = useRequestCache()

  async function generateSummary(text: string, lockedModel?: string): Promise<string | null> {
    const modelToUse = lockedModel || model.value

    if (!modelToUse || !apiKey.value || !platform.value) {
      return null
    }

    try {
      const provider = getProviderFromPlatform(platform.value, apiKey.value, serviceUrl.value)
      const languageModel = provider.getModel(modelToUse)

      const result = await streamText({
        model: languageModel,
        messages: [
          {
            role: 'system',
            content: 'Please summarize the user\'s text and return the title of the text without adding any additional information. The title MUST in less than 4 words. Use the text language to summarize the text. Do not add any punctuation. Add "📝" emoji prefix to the summary.',
          },
          {
            role: 'user',
            content: `Summarize the following text in less than 4 words: ${text}`,
          },
        ],
      })

      let content = ''
      for await (const textPart of result.textStream) {
        content += textPart
      }

      // Cache successful summary request
      cacheSuccessfulRequest({
        preset: platform.value || 'openai',
        serviceUrl: serviceUrl.value!,
        model: modelToUse,
        apiKey: apiKey.value,
      })

      return content
    }
    catch (error) {
      console.error('Failed to generate summary:', error)
      return null
    }
  }

  return {
    generateSummary,
  }
}
