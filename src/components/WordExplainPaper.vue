<script setup lang="ts">
import { Paper, Tag } from '@roku-ui/vue'
import { z } from 'zod'
import { useRequestCache } from '../composables/useRequestCache'
import { apiKey, model, platform, serviceUrl } from '../shared'

const props = withDefaults(defineProps<{
  content?: string
  targetLang?: string
  translationLoading?: boolean
}>(), {})
const content = computed(() => props.content)
// Prompt will be constructed when implementing the request
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
    // TODO: Implement using Vercel AI SDK
    const jsonStr: string | null = null

    if (typeof jsonStr === 'string') {
      const str = jsonStr as string
      // Try to extract JSON from the response
      let parsedResponse: unknown
      // First try to parse as direct JSON
      try {
        parsedResponse = JSON.parse(str)
      }
      catch {
        // If that fails, try to extract JSON from markdown code blocks
        const jsonMatch = str.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
        if (jsonMatch) {
          parsedResponse = JSON.parse(jsonMatch[1])
        }
        else {
          // Try to find JSON object in the text
          const jsonObjectMatch = str.match(/\{[\s\S]*\}/)
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
    else {
      // No response yet; keep loading state false and exit
      loading.value = false
      return
    }
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
