<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { BtnGroup, Paper, ScrollArea } from '@roku-ui/vue'
import StreamContent from '../components/StreamContent.vue'
import { useDexieStorage } from '../composables/useDexieStorage'
import { useRequestCache } from '../composables/useRequestCache'
import { apiKey, client, currentPreset, model, serviceUrl } from '../shared'
import { transformToChatCompletions } from '../utils/messageTransform'

const router = useRouter()
function onHomeClick() {
  router.push({
    name: 'chat-home',
  })
}
const text = ref('')
const targetLang = useDexieStorage('translate.targetLang', 'chinese')
const targetLangDebounced = useDebounce(targetLang, 1000)
const textDebounced = useDebounce(text, 1000)

// 可以指定翻译的语气，可选项为：neutral, formal, informal, professional, friendly
const tone = useDexieStorage<'neutral' | 'formal' | 'informal' | 'professional' | 'friendly'>('translate.tone', 'neutral')
const tonePrompt = computed(() => {
  switch (tone.value) {
    case 'neutral': {
      return 'The tone should be neutral, neither too formal nor too informal, maintaining a balanced and straightforward style'
    }
    case 'formal': {
      return 'The tone should be formal, suitable for official documents, academic papers, or professional communications, with a respectful and polished style'
    }
    case 'informal': {
      return 'The tone should be informal, conversational, and relaxed, as if you were talking to a friend or family member in a casual setting'
    }
    case 'professional': {
      return 'The tone should be professional, appropriate for business communications, reports, or interactions in a corporate environment, with a clear, precise, and respectful style'
    }
    case 'friendly': {
      return 'The tone should be friendly, warm, and approachable, creating a sense of familiarity and comfort as if speaking to a close acquaintance'
    }
    default: {
      return ''
    }
  }
})
const conversation = computed<ChatMessage[]>(() => [{
  id: 'system-1',
  role: 'system',
  content: `Translate user\'s input to ${targetLangDebounced.value}. ${tonePrompt.value}. If the input text is already in ${targetLang.value}, just rewrite with ${tone.value} tone.`,
  timestamp: Date.now(),
}, {
  id: 'user-1',
  role: 'user',
  content: `${textDebounced.value}`,
  timestamp: Date.now(),
}])

const { cacheSuccessfulRequest } = useRequestCache()
const translateContent = ref('')
const loading = ref(false)
let requestId = 0
watchEffect(async () => {
  try {
    if (textDebounced.value === '') {
      return
    }

    loading.value = true
    translateContent.value = ''

    const currentRequestId = ++requestId
    const filteredConversition = conversation.value.slice(0, -1).filter(d => d.role !== 'error').map((d) => {
      if (d.role === 'assistant') {
        delete d.reasoning
      }
      return d
    })

    const stream = await client.value.chat.completions.create({
      model: model.value,
      stream: true,
      messages: transformToChatCompletions(filteredConversition),
    })

    let streamCompleted = false
    for await (const chunk of stream) {
      // 检查是否是最新的请求
      if (currentRequestId !== requestId) {
        return
      }
      if (chunk.choices[0].delta.content) {
        translateContent.value += chunk.choices[0].delta.content
      }
      // Check if chunk has usage to indicate completion
      if (chunk.usage) {
        streamCompleted = true
      }
    }

    // 请求未被中断
    if (currentRequestId === requestId) {
      loading.value = false

      // Cache successful translation request
      if (streamCompleted || translateContent.value.trim()) {
        cacheSuccessfulRequest({
          preset: currentPreset.value || 'openai',
          serviceUrl: serviceUrl.value,
          model: model.value,
          apiKey: apiKey.value,
        })
      }
    }
  }
  catch (error) {
    console.error(error)
    loading.value = false
  }
})
</script>

<template>
  <BaseContainer>
    <AsideContainer>
      <div
        class="mt-104px pb-4"
      >
        <button
          class="min-w-130px flex items-center gap-4 rounded-full bg-neutral-8 px-4 py-3 leading-0 disabled:pointer-events-none hover:bg-neutral-7 disabled:op-50"
          @click="onHomeClick"
        >
          <i class="i-tabler-home h-5 w-5" />
          <span class="flex-grow-1 text-sm">
            Home
          </span>
        </button>
      </div>
    </AsideContainer>
    <MainContainer>
      <ChatHeader />
      <ScrollArea
        is="main"
        class="h-full flex flex-col overflow-x-hidden overflow-y-auto"
      >
        <div
          class="m-auto max-w-830px w-full flex flex-col gap-4 px-2 font-medium"
        >
          <div>
            <div class="mb-12 mt-8 text-3.5rem">
              <div class="gradient-text">
                Translate
              </div>
            </div>
            <div class="animate-fade-delay">
              <div class="mb-6 flex flex-wrap items-center gap-4">
                <div class="relative">
                  <i class="i-tabler-language absolute left-4 top-1/2 h-5 w-5 text-neutral-400 -translate-y-1/2" />
                  <input
                    v-model="targetLang"
                    placeholder="Language"
                    class="bg-surface-base/80 focus:ring-primary-500/20 focus:border-primary-500 h-46px w-40 border border-neutral-700/50 rounded-2xl py-3 pl-12 pr-4 text-lg outline-none transition-all focus:ring-2"
                  >
                </div>
                <div>
                  <BtnGroup
                    v-model="tone"
                    color="primary"
                    class="shadow-md children:py-3 children:h-full! children:min-w-120px! children:border-neutral-700! first-children:rounded-2xl last-children:rounded-2xl"
                    :unselectable="false"
                    :selections="[
                      { label: 'Neutral', value: 'neutral' },
                      { label: 'Formal', value: 'formal' },
                      { label: 'Professional', value: 'professional' },
                      { label: 'Informal', value: 'informal' },
                      { label: 'Friendly', value: 'friendly' },
                    ]"
                  />
                </div>
              </div>
              <div class="relative">
                <textarea
                  v-model="text"
                  placeholder="Enter text to translate..."
                  style="resize: none; scrollbar-width: none; min-height: 200px; height: auto;"
                  class="focus:border-primary-500 focus:ring-primary-500/20 z-10 w-full flex-grow-0 border border-neutral-700/50 rounded-2xl bg-neutral-800/80 px-6 py-5 text-lg text-neutral-200 outline-1 outline-none transition-all focus:bg-neutral-8 hover:bg-neutral-8 focus-visible:outline-1 focus-visible:outline-transparent focus-visible:outline-offset-0 focus:ring-2"
                />
                <div class="absolute bottom-4 right-4 text-xs text-neutral-500">
                  {{ text.length }} characters
                </div>
              </div>
            </div>
          </div>
          <Paper
            :loading="loading"
            class="animate-fade-delay bg-surface-low/80 min-h-110px flex-shrink-1 border border-neutral-700/50 p-6 shadow-lg backdrop-blur-sm rounded-2xl!"
          >
            <div
              v-if="loading"
              class="h-110px flex items-center justify-center"
            >
              <div class="loader border-primary-400 h-8 w-8 animate-spin border-t-2 border-b-transparent border-l-transparent border-r-transparent rounded-full" />
            </div>
            <StreamContent
              v-else
              class="max-w-full"
              :content="translateContent"
              :loading="!translateContent"
            />
          </Paper>
        </div>
      </ScrollArea>
    </MainContainer>
  </BaseContainer>
</template>
