<script setup lang="ts">
import type { ChatMessage } from '../types/message'
import { BtnGroup, ScrollArea, Select } from '@roku-ui/vue'
import StreamContent from '../components/StreamContent.vue'
import WordExplainPaper from '../components/WordExplainPaper.vue'
import { useDexieStorage } from '../composables/useDexieStorage'
import { useRequestCache } from '../composables/useRequestCache'
import { apiKey, currentPreset, model, serviceUrl } from '../shared'
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

    // TODO: Implement using Vercel AI SDK
    // Temporarily disabled for refactoring
    loading.value = false
    
    // cacheSuccessfulRequest({
    //   preset: currentPreset.value || 'openai',
    //   serviceUrl: serviceUrl.value,
    //   model: model.value,
    //   apiKey: apiKey.value,
    // })

    // // Save to history
    // saveToHistory(textDebounced.value, translateContent.value)
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
          class="dark:hover:bg-neutral-7 leading-0 px-4 py-3 rounded-full bg-neutral-300 flex gap-4 min-w-130px items-center dark:bg-neutral-800 hover:bg-neutral-400 disabled:op-50 disabled:pointer-events-none"
          @click="onHomeClick"
        >
          <i class="i-tabler-home h-5 w-5" />
          <span class="text-sm flex-grow-1">Home</span>
        </button>
      </div>

      <!-- Translation History Sidebar -->
      <div v-if="translationHistory.length > 0" class="mt-6 px-4">
        <div class="text-sm text-neutral-400 font-medium mb-3 flex gap-2 items-center">
          <i class="i-tabler-history h-4 w-4" />
          Recent
        </div>
      </div>
      <div v-if="translationHistory.length > 0" class="px-4 flex-grow basis-0 overflow-x-hidden overflow-y-auto">
        <div class="space-y-2">
          <div
            v-for="item in translationHistory.slice(0, 8)"
            :key="item.id"
            class="group p-3 border border-neutral-300/30 rounded-xl bg-neutral-200/30 cursor-pointer transition-all dark:border-neutral-700/30 dark:bg-neutral-800/30 hover:bg-neutral-300/60 dark:hover:bg-neutral-800/60"
            @click="text = item.source; translateContent = item.target"
          >
            <div class="text-sm text-neutral-600 leading-relaxed truncate dark:text-neutral-300 group-hover:text-neutral-800 dark:group-hover:text-white">
              {{ item.source }}
            </div>
            <div class="text-xs text-neutral-400 mt-2 truncate dark:text-neutral-500 group-hover:text-neutral-600 dark:group-hover:text-neutral-400">
              {{ item.target }}
            </div>
          </div>
        </div>
      </div>
    </AsideContainer>

    <MainContainer>
      <ChatHeader />
      <ScrollArea is="main" class="flex flex-col h-full overflow-x-hidden overflow-y-auto">
        <div class="mx-auto px-6 py-8 flex flex-col gap-8 max-w-7xl w-full">
          <!-- Header -->
          <div class="text-center">
            <div class="text-4xl font-bold mb-4">
              <div class="gradient-text flex gap-3 items-center justify-center">
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
            <div class="p-8 border border-neutral-300/50 rounded-2xl bg-neutral-200/40 backdrop-blur-sm dark:border-neutral-700/50 dark:bg-neutral-800/40">
              <!-- Tone Selection -->
              <div class="flex justify-center">
                <div class="text-sm text-neutral-400 font-medium mb-3 flex gap-2 items-center">
                  <i class="i-tabler-mood-smile h-4 w-4" />
                  Tone
                </div>
              </div>
              <div class="flex justify-center">
                <BtnGroup
                  v-model="tone"
                  color="primary"
                  class="shadow-md children:text-sm children:py-3 children:border-neutral-700! first-children:rounded-xl last-children:rounded-xl children:h-full! children:min-w-90px!"
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
            <div class="border border-neutral-300/50 rounded-2xl bg-neutral-200/40 backdrop-blur-sm dark:border-neutral-700/50 dark:bg-neutral-800/40">
              <div class="grid grid-cols-1 min-h-600px lg:grid-cols-2">
                <!-- Input Panel -->
                <div class="p-8 border-b border-neutral-700/50 lg:border-b-0 lg:border-r">
                  <!-- Language Selection -->
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex gap-3 items-center">
                      <div class="text-sm text-neutral-400 font-medium flex gap-2 items-center">
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
                          <div class="flex gap-2 items-center">
                            <span>{{ data.flag }}</span>
                            <span>{{ data.name }}</span>
                          </div>
                        </template>
                      </Select>

                      <button
                        :disabled="sourceLang.id === 'auto'"
                        class="p-2 rounded-full bg-neutral-300/60 transition-all dark:bg-neutral-800/60 hover:bg-neutral-400 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 hover:scale-110 dark:hover:bg-neutral-700"
                        @click="swapLanguages"
                      >
                        <i class="i-tabler-switch-3 h-4 w-4" />
                      </button>
                    </div>
                    <div class="flex gap-2 items-center">
                      <div v-if="text.length > 0" class="text-xs text-neutral-500">
                        {{ text.length }} chars
                      </div>
                      <div v-if="isTyping" class="text-primary-400 text-xs flex gap-1 items-center">
                        <i class="i-tabler-pencil h-4 w-4 animate-pulse" />
                        <span>Typing...</span>
                      </div>
                      <button
                        class="p-2 rounded-lg bg-neutral-200/50 transition-all dark:bg-neutral-900/50 hover:bg-neutral-300/50 hover:scale-105 dark:hover:bg-neutral-800/50"
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
                      class="text-xl text-neutral-200 leading-relaxed outline-none border-none bg-transparent w-full placeholder-neutral-500"
                    />
                  </div>
                </div>

                <!-- Output Panel -->
                <div class="p-8 bg-neutral-200/30 dark:bg-neutral-900/30">
                  <!-- Language Selection -->
                  <div class="mb-4 flex items-center justify-between">
                    <div class="flex gap-3 items-center">
                      <div class="text-sm text-neutral-400 font-medium flex gap-2 items-center">
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
                          <div class="flex gap-2 items-center">
                            <span>{{ data.flag }}</span>
                            <span>{{ data.name }}</span>
                          </div>
                        </template>
                      </Select>
                    </div>
                    <div class="flex gap-2 items-center">
                      <div v-if="loading" class="text-primary-400 text-xs flex gap-1 items-center">
                        <i class="i-tabler-brain h-4 w-4 animate-pulse" />
                        <span>Translating...</span>
                      </div>
                      <button
                        v-if="translateContent"
                        class="p-2 rounded-lg bg-neutral-200/50 transition-all dark:bg-neutral-900/50 hover:bg-neutral-300/50 hover:scale-105 dark:hover:bg-neutral-800/50"
                        @click="copyToClipboard(translateContent)"
                      >
                        <i class="i-tabler-clipboard h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div class="min-h-520px relative">
                    <div v-if="loading" class="flex items-center inset-0 justify-center absolute">
                      <div class="text-neutral-400 flex gap-3 items-center">
                        <div class="border-primary-400 border-2 border-t-transparent rounded-full h-6 w-6 animate-spin" />
                        <span>Translating...</span>
                      </div>
                    </div>
                    <div v-else-if="!translateContent && text.length === 0" class="text-neutral-500 flex items-center inset-0 justify-center absolute">
                      <div class="text-center">
                        <i class="i-tabler-language mb-3 opacity-50 h-12 w-12" />
                        <p class="text-sm">
                          Translation will appear here
                        </p>
                      </div>
                    </div>
                    <div v-else-if="!translateContent && text.length > 0" class="text-neutral-500 flex items-center inset-0 justify-center absolute">
                      <div class="text-center">
                        <i class="i-tabler-dots mb-2 h-8 w-8 animate-pulse" />
                        <p class="text-sm">
                          Preparing translation...
                        </p>
                      </div>
                    </div>
                    <StreamContent
                      v-else
                      class="text-xl leading-relaxed max-w-full"
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
            <div class="p-8 border border-neutral-300/50 rounded-2xl bg-neutral-200/40 backdrop-blur-sm dark:border-neutral-700/50 dark:bg-neutral-800/40">
              <div class="mb-4 flex items-center justify-between">
                <div class="flex gap-2 items-center">
                  <i class="text-primary-400 i-tabler-vocabulary h-5 w-5" />
                  <span class="text-lg font-medium">Word Explanations</span>
                </div>
                <button
                  class="p-2 rounded-lg bg-neutral-200/50 transition-all dark:bg-neutral-900/50 hover:bg-neutral-300/50 hover:scale-105 dark:hover:bg-neutral-800/50"
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
                  class="text-neutral-500 pt-8 text-center flex transition-all duration-300 ease-in-out items-start justify-center"
                >
                  <div>
                    <i class="i-tabler-eye-off mb-2 opacity-50 h-8 w-8" />
                    <p class="text-sm">
                      Word explanations are hidden
                    </p>
                    <p class="text-xs text-neutral-600 mt-1">
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
