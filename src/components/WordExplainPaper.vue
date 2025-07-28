<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { Paper, Tag } from '@roku-ui/vue'
import { z } from 'zod'
import { useRequestCache } from '../composables/useRequestCache'
import { apiKey, client, model, platform, serviceUrl } from '../shared'
import { transformToChatCompletions } from '../utils/messageTransform'

const props = withDefaults(defineProps<{
  content?: string
  targetLang?: string
  translationLoading?: boolean
}>(), {})
const targetLang = computed(() => props.targetLang)
const content = computed(() => props.content)
const prompt = computed(() => {
  return `Based on the content I provide, analyze and extract key difficult words that help in understanding the content, and explain them. Your explanation should be in the form of a JSON array of objects, including the following fields: word, part of speech, explanation in ${targetLang.value}, synonyms (if any) in the target language (${targetLang.value}). 

Please respond with ONLY a valid JSON object in this exact format:
{
  "explains": [
    {
      "word": "example",
      "pos": "noun",
      "explain": "explanation in ${targetLang.value}",
      "synonyms": ["synonym1", "synonym2"]
    }
  ]
}

The content I provide is: "${content.value}"`
})
const conversation = computed<ChatMessage[]>(() => {
  return [{
    id: 'user-message-1',
    role: 'user',
    content: prompt.value,
    timestamp: Date.now(),
  }]
})
const { cacheSuccessfulRequest } = useRequestCache()

const Explains = z.array(z.object({
  word: z.string(),
  pos: z.string(),
  explain: z.string(),
  synonyms: z.array(z.string()),
}))
const WordExplainsResp = z.object({
  explains: Explains,
})
const explains = ref<z.infer<typeof Explains>>()
const loading = ref(false)
const hasTriggered = ref(false)

// Watch for translation completion
watch([() => props.translationLoading, content], async ([translationLoading, currentContent]) => {
  // Only trigger when translation just finished and we have content
  if (translationLoading === false && currentContent && currentContent.trim() !== '' && !hasTriggered.value) {
    hasTriggered.value = true
    await explainWords()
  }
  // Reset flag when translation starts again
  if (translationLoading === true) {
    hasTriggered.value = false
    explains.value = undefined
  }
})

async function explainWords() {
  if (!content.value || content.value === '') {
    return
  }
  loading.value = true
  try {
    const resp = await client.value.chat.completions.create({
      model: model.value,
      messages: transformToChatCompletions(conversation.value),
    })
    const jsonStr = resp.choices[0].message.content
    if (!jsonStr) {
      return
    }

    // Try to extract JSON from the response
    let parsedResponse
    try {
      // First try to parse as direct JSON
      parsedResponse = JSON.parse(jsonStr)
    }
    catch {
      // If that fails, try to extract JSON from markdown code blocks
      const jsonMatch = jsonStr.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[1])
      }
      else {
        // Try to find JSON object in the text
        const jsonObjectMatch = jsonStr.match(/\{[\s\S]*\}/)
        if (jsonObjectMatch) {
          parsedResponse = JSON.parse(jsonObjectMatch[0])
        }
        else {
          throw new Error('No valid JSON found in response')
        }
      }
    }

    const e = WordExplainsResp.parse(parsedResponse)
    explains.value = e.explains

    // Cache successful word explanation request
    cacheSuccessfulRequest({
      preset: platform.value || 'openai',
      serviceUrl: serviceUrl.value,
      model: model.value,
      apiKey: apiKey.value,
    })
  }
  catch (error) {
    console.error('WordExplainPaper error:', error)
  }
  loading.value = false
}
</script>

<template>
  <Paper
    v-if="content && !translationLoading"
    :loading="loading"
    :rounded="1"
    class="not-prose border border-transparent flex flex-col gap-8 min-h-32"
  >
    <div
      v-for="e, i in explains"
      :key="i"
      class="flex flex-col gap-2"
    >
      <div class="flex gap-2 items-end">
        <span class="text-3xl font-bold">
          {{ e.word }}
        </span>
        <Tag
          size="sm"
          class="font-mono"
        >
          {{ e.pos }}
        </Tag>
      </div>
      <div class="text-sm flex gap-2">
        <span
          v-for="synonym in e.synonyms"
          :key="synonym"
        >
          {{ synonym }}
        </span>
      </div>
      <div class="text-sm">
        {{ e.explain }}
      </div>
    </div>
  </Paper>
</template>
