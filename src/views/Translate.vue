<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { BtnGroup, ScrollArea, Select } from '@roku-ui/vue'
import StreamContent from '../components/StreamContent.vue'
import WordExplainPaper from '../components/WordExplainPaper.vue'
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

// Enhanced language configuration
const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ru', name: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', flag: '🇸🇦' },
  { code: 'pt', name: 'Português', flag: '🇵🇹' },
  { code: 'it', name: 'Italiano', flag: '🇮🇹' },
  { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' },
  { code: 'da', name: 'Dansk', flag: '🇩🇰' },
  { code: 'no', name: 'Norsk', flag: '🇳🇴' },
  { code: 'fi', name: 'Suomi', flag: '🇫🇮' },
  { code: 'pl', name: 'Polski', flag: '🇵🇱' },
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'hi', name: 'हिन्दी', flag: '🇮🇳' },
  { code: 'th', name: 'ไทย', flag: '🇹🇭' },
  { code: 'vi', name: 'Tiếng Việt', flag: '🇻🇳' },
]

const text = ref('')
const sourceLang = useDexieStorage('translate.sourceLang', { id: 'auto', name: 'Auto Detect', flag: '🔍' })
const targetLang = useDexieStorage('translate.targetLang', { id: 'zh', name: '中文', flag: '🇨🇳' })
const tone = useDexieStorage<'neutral' | 'formal' | 'informal' | 'professional' | 'friendly'>('translate.tone', 'neutral')
const showWordExplain = useDexieStorage('translate.showWordExplain', true)
const translationHistory = useDexieStorage<Array<{ id: string, source: string, target: string, sourceLang: string, targetLang: string, timestamp: number }>>('translate.history', [])

const textDebounced = useDebounce(text, 1000)

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

const targetLanguage = computed(() => {
  return SUPPORTED_LANGUAGES.find(lang => lang.code === targetLang.value.id) || SUPPORTED_LANGUAGES[1]
})

const conversation = computed<ChatMessage[]>(() => [{
  id: 'system-1',
  role: 'system',
  content: `Translate user's input to ${targetLanguage.value.name}. ${tonePrompt.value}. If the input text is already in ${targetLanguage.value.name}, just rewrite with ${tone.value} tone.`,
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
const isTyping = ref(false)
let requestId = 0

// Language swap function
function swapLanguages() {
  if (sourceLang.value.id === 'auto') {
    return
  }
  const temp = sourceLang.value
  sourceLang.value = targetLang.value
  targetLang.value = temp
  // Also swap the text content
  if (translateContent.value) {
    const tempText = text.value
    text.value = translateContent.value
    translateContent.value = tempText
  }
}

// Clear all content
function clearContent() {
  text.value = ''
  translateContent.value = ''
}

// Copy content to clipboard
function copyToClipboard(content: string) {
  navigator.clipboard.writeText(content)
}

// Save translation to history
function saveToHistory(source: string, target: string) {
  const historyItem = {
    id: Date.now().toString(),
    source,
    target,
    sourceLang: sourceLang.value.id,
    targetLang: targetLang.value.id,
    timestamp: Date.now(),
  }
  translationHistory.value.unshift(historyItem)
  // Keep only last 50 translations
  if (translationHistory.value.length > 50) {
    translationHistory.value = translationHistory.value.slice(0, 50)
  }
}

// Watch for typing indicator
watch(text, () => {
  isTyping.value = true
  setTimeout(() => {
    isTyping.value = false
  }, 1000)
})

watchEffect(async () => {
  try {
    if (textDebounced.value === '') {
      translateContent.value = ''
      return
    }

    loading.value = true
    translateContent.value = ''

    const currentRequestId = ++requestId
    const filteredConversation = conversation.value.filter(d => d.role !== 'error').map((d) => {
      if (d.role === 'assistant') {
        delete d.reasoning
      }
      return d
    })

    const stream = await client.value.chat.completions.create({
      model: model.value,
      stream: true,
      messages: transformToChatCompletions(filteredConversation),
    })

    let streamCompleted = false
    for await (const chunk of stream) {
      if (currentRequestId !== requestId) {
        return
      }
      if (chunk.choices[0].delta.content) {
        translateContent.value += chunk.choices[0].delta.content
      }
      if (chunk.usage) {
        streamCompleted = true
      }
    }

    if (currentRequestId === requestId) {
      loading.value = false

      if (streamCompleted || translateContent.value.trim()) {
        cacheSuccessfulRequest({
          preset: currentPreset.value || 'openai',
          serviceUrl: serviceUrl.value,
          model: model.value,
          apiKey: apiKey.value,
        })

        // Save to history
        saveToHistory(textDebounced.value, translateContent.value)
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
      <div class="mt-104px pb-4">
        <button
          class="min-w-130px flex items-center gap-4 rounded-full bg-neutral-8 px-4 py-3 leading-0 disabled:pointer-events-none hover:bg-neutral-7 disabled:op-50"
          @click="onHomeClick"
        >
          <i class="i-tabler-home h-5 w-5" />
          <span class="flex-grow-1 text-sm">Home</span>
        </button>
      </div>

      <!-- Translation History Sidebar -->
      <div v-if="translationHistory.length > 0" class="mt-6 px-4">
        <div class="mb-3 flex items-center gap-2 text-sm text-neutral-400 font-medium">
          <i class="i-tabler-history h-4 w-4" />
          Recent
        </div>
      </div>
      <div v-if="translationHistory.length > 0" class="flex-grow basis-0 overflow-x-hidden overflow-y-auto px-4">
        <div class="space-y-2">
          <div
            v-for="item in translationHistory.slice(0, 8)"
            :key="item.id"
            class="group cursor-pointer border border-neutral-700/30 rounded-xl bg-neutral-800/30 p-3 transition-all hover:bg-neutral-800/60"
            @click="text = item.source; translateContent = item.target"
          >
            <div class="truncate text-sm text-neutral-300 leading-relaxed group-hover:text-white">
              {{ item.source }}
            </div>
            <div class="mt-2 truncate text-xs text-neutral-500 group-hover:text-neutral-400">
              {{ item.target }}
            </div>
          </div>
        </div>
      </div>
    </AsideContainer>

    <MainContainer>
      <ChatHeader />
      <ScrollArea is="main" class="h-full flex flex-col overflow-x-hidden overflow-y-auto">
        <div class="mx-auto max-w-7xl w-full flex flex-col gap-8 px-6 py-8">
          <!-- Header -->
          <div class="text-center">
            <div class="mb-4 text-4xl font-bold">
              <div class="gradient-text flex items-center justify-center gap-3">
                <i class="i-tabler-world h-12 w-12" />
                Translate
              </div>
            </div>
            <p class="text-sm text-neutral-400">
              AI-powered translation with natural language understanding
            </p>
          </div>

          <!-- Tone Controls -->
          <div class="animate-fade-delay">
            <div class="border border-neutral-700/50 rounded-2xl bg-neutral-800/40 p-8 backdrop-blur-sm">
              <!-- Tone Selection -->
              <div class="flex justify-center">
                <div class="mb-3 flex items-center gap-2 text-sm text-neutral-400 font-medium">
                  <i class="i-tabler-mood-smile h-4 w-4" />
                  Tone
                </div>
              </div>
              <div class="flex justify-center">
                <BtnGroup
                  v-model="tone"
                  color="primary"
                  class="shadow-md children:py-3 children:text-sm children:h-full! children:min-w-90px! children:border-neutral-700! first-children:rounded-xl last-children:rounded-xl"
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
          </div>

          <!-- Main Translation Interface -->
          <div class="animate-fade-delay">
            <div class="border border-neutral-700/50 rounded-2xl bg-neutral-800/40 backdrop-blur-sm">
              <div class="grid grid-cols-1 min-h-600px lg:grid-cols-2">
                <!-- Input Panel -->
                <div class="border-b border-neutral-700/50 p-8 lg:border-b-0 lg:border-r">
                  <!-- Language Selection -->
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex items-center gap-2 text-sm text-neutral-400 font-medium">
                        <i class="i-tabler-arrow-right h-4 w-4" />
                        From
                      </div>
                      <Select
                        v-model="sourceLang"
                        :options="[{ id: 'auto', name: 'Auto Detect', flag: '🔍' }, ...SUPPORTED_LANGUAGES.map(lang => ({ id: lang.code, name: lang.name, flag: lang.flag }))]"
                        size="lg"
                        color="primary"
                        placeholder="Select source language"
                        searchable
                        class="h-10 w-200px"
                      >
                        <template #item="{ data }">
                          <div class="flex items-center gap-2">
                            <span>{{ data.flag }}</span>
                            <span>{{ data.name }}</span>
                          </div>
                        </template>
                      </Select>

                      <button
                        :disabled="sourceLang.id === 'auto'"
                        class="rounded-full bg-neutral-800/60 p-2 transition-all active:scale-95 hover:scale-110 disabled:cursor-not-allowed hover:bg-neutral-700 disabled:opacity-50"
                        @click="swapLanguages"
                      >
                        <i class="i-tabler-switch-3 h-4 w-4" />
                      </button>
                    </div>
                    <div class="flex items-center gap-2">
                      <div v-if="text.length > 0" class="text-xs text-neutral-500">
                        {{ text.length }} chars
                      </div>
                      <div v-if="isTyping" class="text-primary-400 flex items-center gap-1 text-xs">
                        <i class="i-tabler-pencil h-4 w-4 animate-pulse" />
                        <span>Typing...</span>
                      </div>
                      <button
                        class="rounded-lg bg-neutral-900/50 p-2 transition-all hover:scale-105 hover:bg-neutral-800/50"
                        @click="clearContent"
                      >
                        <i class="i-tabler-eraser h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div class="relative">
                    <textarea
                      v-model="text"
                      placeholder="Enter text to translate..."
                      style="resize: none; scrollbar-width: none; min-height: 520px;"
                      class="w-full border-none bg-transparent text-xl text-neutral-200 leading-relaxed outline-none placeholder-neutral-500"
                    />
                  </div>
                </div>

                <!-- Output Panel -->
                <div class="bg-neutral-900/30 p-8">
                  <!-- Language Selection -->
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      <div class="flex items-center gap-2 text-sm text-neutral-400 font-medium">
                        To
                        <i class="i-tabler-arrow-right h-4 w-4" />
                      </div>
                      <Select
                        v-model="targetLang"
                        :options="SUPPORTED_LANGUAGES.map(lang => ({ id: lang.code, name: lang.name, flag: lang.flag }))"
                        size="lg"
                        color="primary"
                        placeholder="Select target language"
                        searchable
                        class="h-10 w-200px"
                      >
                        <template #item="{ data }">
                          <div class="flex items-center gap-2">
                            <span>{{ data.flag }}</span>
                            <span>{{ data.name }}</span>
                          </div>
                        </template>
                      </Select>
                    </div>
                    <div class="flex items-center gap-2">
                      <div v-if="loading" class="text-primary-400 flex items-center gap-1 text-xs">
                        <i class="i-tabler-brain h-4 w-4 animate-pulse" />
                        <span>Translating...</span>
                      </div>
                      <button
                        v-if="translateContent"
                        class="rounded-lg bg-neutral-900/50 p-2 transition-all hover:scale-105 hover:bg-neutral-800/50"
                        @click="copyToClipboard(translateContent)"
                      >
                        <i class="i-tabler-clipboard h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div class="relative min-h-520px">
                    <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
                      <div class="flex items-center gap-3 text-neutral-400">
                        <div class="border-primary-400 h-6 w-6 animate-spin border-2 border-t-transparent rounded-full" />
                        <span>Translating...</span>
                      </div>
                    </div>
                    <div v-else-if="!translateContent && text.length === 0" class="absolute inset-0 flex items-center justify-center text-neutral-500">
                      <div class="text-center">
                        <i class="i-tabler-language mb-3 h-12 w-12 opacity-50" />
                        <p class="text-sm">
                          Translation will appear here
                        </p>
                      </div>
                    </div>
                    <div v-else-if="!translateContent && text.length > 0" class="absolute inset-0 flex items-center justify-center text-neutral-500">
                      <div class="text-center">
                        <i class="i-tabler-dots mb-2 h-8 w-8 animate-pulse" />
                        <p class="text-sm">
                          Preparing translation...
                        </p>
                      </div>
                    </div>
                    <StreamContent
                      v-else
                      class="max-w-full text-xl leading-relaxed"
                      :content="translateContent"
                      :loading="false"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Word Explanation Panel -->
          <div v-if="translateContent" class="animate-fade-delay">
            <div class="border border-neutral-700/50 rounded-2xl bg-neutral-800/40 p-8 backdrop-blur-sm">
              <div class="mb-4 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <i class="text-primary-400 i-tabler-vocabulary h-5 w-5" />
                  <span class="text-lg font-medium">Word Explanations</span>
                </div>
                <button
                  class="rounded-lg bg-neutral-900/50 p-2 transition-all hover:scale-105 hover:bg-neutral-800/50"
                  @click="showWordExplain = !showWordExplain"
                >
                  <i :class="showWordExplain ? 'i-tabler-eye-off' : 'i-tabler-eye'" class="h-4 w-4" />
                </button>
              </div>

              <div class="min-h-160px">
                <div
                  v-if="showWordExplain"
                  class="transition-all duration-300 ease-in-out"
                  :class="showWordExplain ? 'opacity-100' : 'opacity-0'"
                >
                  <WordExplainPaper
                    :content="translateContent"
                    :target-lang="targetLanguage.name"
                    :translation-loading="loading"
                  />
                </div>

                <div
                  v-else
                  class="flex items-start justify-center pt-8 text-center text-neutral-500 transition-all duration-300 ease-in-out"
                >
                  <div>
                    <i class="i-tabler-eye-off mb-2 h-8 w-8 opacity-50" />
                    <p class="text-sm">
                      Word explanations are hidden
                    </p>
                    <p class="mt-1 text-xs text-neutral-600">
                      Click the eye icon to show detailed explanations
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </MainContainer>
  </BaseContainer>
</template>
