<script setup lang="ts">
import type { SentableChatMessage } from '../composables/useHelloWorld'
import { Paper, Tag } from '@roku-ui/vue'
import { zodResponseFormat } from 'openai/helpers/zod'
import { z } from 'zod'
import { model } from '../shared'

const props = withDefaults(defineProps<{
  content?: string
  targetLang?: string
}>(), {})
const targetLang = computed(() => props.targetLang)
const content = computed(() => props.content)
const prompt = computed(() => {
  return `Based on the content I provide, analyze and extract key difficult words that help in understanding the content, and explain them. Your explanation should be in the form of a JSON array of objects, including the following fields: word, part of speech, explanation in ${targetLang.value}, synonyms (if any) in the target language (${targetLang.value}). The content I provide is: "${props.content}"`
})
const conversation = computed<SentableChatMessage[]>(() => {
  return [{
    role: 'user',
    content: prompt.value,
  }]
})
const client = useClient()

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
watchEffect(async () => {
  if (content.value === '') {
    return
  }
  loading.value = true
  const resp = await client.value.chat.completions.create({
    model: model.value,
    messages: conversation.value,
    response_format: zodResponseFormat(WordExplainsResp, 'explains'),
  })
  const jsonStr = resp.choices[0].message.content
  if (!jsonStr) {
    return
  }
  const e = WordExplainsResp.parse(JSON.parse(jsonStr))
  explains.value = e.explains
  loading.value = false
})
</script>

<template>
  <Paper
    v-if="content"
    :loading="loading"
    :rounded="1"
    class="not-prose min-h-32 flex flex-col gap-8 border border-transparent"
  >
    <div
      v-for="e, i in explains"
      :key="i"
      class="flex flex-col gap-2"
    >
      <div class="flex items-end gap-2">
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
      <div class="flex gap-2 text-sm">
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
