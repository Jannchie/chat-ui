<script setup lang="ts">
import StreamContent from '../components/StreamContent.vue'
import WordExplainPaper from '../components/WordExplainPaper.vue'
import { useDexieStorage } from '../composables/useDexieStorage'

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

const TONE_OPTIONS = [
  { label: 'Neutral', value: 'neutral' },
  { label: 'Formal', value: 'formal' },
  { label: 'Professional', value: 'professional' },
  { label: 'Informal', value: 'informal' },
  { label: 'Friendly', value: 'friendly' },
] as const

const text = ref('')
const sourceLang = useDexieStorage('translate.sourceLang', {
  id: 'auto',
  name: 'Auto Detect',
  flag: '🔍',
})
const targetLang = useDexieStorage('translate.targetLang', {
  id: 'zh',
  name: '中文',
  flag: '🇨🇳',
})
const tone = useDexieStorage<
  'neutral' | 'formal' | 'informal' | 'professional' | 'friendly'
>('translate.tone', 'neutral')
const showWordExplain = useDexieStorage('translate.showWordExplain', true)
const translationHistory = useDexieStorage<
  Array<{
    id: string
    source: string
    target: string
    sourceLang: string
    targetLang: string
    timestamp: number
  }>
>('translate.history', [])

const textDebounced = useDebounce(text, 1000)

// Tone prompt text will be constructed when wiring AI call

const targetLanguage = computed(() => {
  return (
    SUPPORTED_LANGUAGES.find(lang => lang.code === targetLang.value.id)
    || SUPPORTED_LANGUAGES[1]
  )
})

// Conversation payload will be constructed when wiring the AI call

const translateContent = ref('')
const loading = ref(false)
const isTyping = ref(false)

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

// Copy content to clipboard, with transient feedback on the button
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
function copyToClipboard(content: string) {
  // HTTP 等非安全上下文下 clipboard API 不存在
  if (!navigator.clipboard?.writeText) {
    console.warn('Clipboard API is not available in this context.')
    return
  }
  navigator.clipboard
    .writeText(content)
    .then(() => {
      copied.value = true
      if (copiedTimer !== undefined) {
        clearTimeout(copiedTimer)
      }
      copiedTimer = setTimeout(() => {
        copied.value = false
        copiedTimer = undefined
      }, 2000)
    })
    .catch((error) => {
      console.error(`Failed to copy content: ${error}`)
    })
}

// Watch for typing indicator
let typingTimer: ReturnType<typeof setTimeout> | undefined
watch(text, () => {
  isTyping.value = true
  if (typingTimer !== undefined) {
    clearTimeout(typingTimer)
  }
  typingTimer = setTimeout(() => {
    isTyping.value = false
    typingTimer = undefined
  }, 1000)
})

onBeforeUnmount(() => {
  if (typingTimer !== undefined) {
    clearTimeout(typingTimer)
  }
  if (copiedTimer !== undefined) {
    clearTimeout(copiedTimer)
  }
})

watchEffect(async () => {
  try {
    if (textDebounced.value === '') {
      translateContent.value = ''
      return
    }

    loading.value = true
    translateContent.value = ''

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
          class="min-w-130px flex items-center gap-4 rounded-full bg-neutral-300 px-4 py-3 leading-0 disabled:pointer-events-none dark:bg-neutral-800 hover:bg-neutral-400 disabled:op-50 dark:hover:bg-neutral-7"
          @click="onHomeClick"
        >
          <i class="i-tabler-home h-5 w-5" />
          <span class="flex-grow-1 text-sm">Home</span>
        </button>
      </div>

      <!-- Translation History Sidebar -->
      <template v-if="translationHistory.length > 0">
        <div class="my-2 px-4">
          <span class="text-sm">Recent</span>
        </div>
        <div class="flex-grow basis-0 overflow-x-hidden overflow-y-auto">
          <button
            v-for="item in translationHistory.slice(0, 8)"
            :key="item.id"
            class="w-full rounded-lg px-3 py-2 text-left transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
            @click="
              text = item.source;
              translateContent = item.target;
            "
          >
            <div class="truncate text-sm text-neutral-700 dark:text-neutral-300">
              {{ item.source }}
            </div>
            <div class="mt-0.5 truncate text-xs text-neutral-400 dark:text-neutral-500">
              {{ item.target }}
            </div>
          </button>
        </div>
      </template>
    </AsideContainer>

    <MainContainer>
      <ChatHeader />
      <main class="h-full flex flex-col overflow-x-hidden overflow-y-auto">
        <div class="mx-auto max-w-chat w-full flex flex-col gap-6 px-4 py-6">
          <!-- Page heading, same voice as the chat home screen -->
          <div class="md:mt-4">
            <div class="gradient-text text-2xl font-medium md:text-3xl">
              Translate
            </div>
            <div class="animate-fade-delay mt-1 text-sm op-50">
              Type below and the translation follows as you pause.
            </div>
          </div>

          <!-- Language & tone toolbar -->
          <!-- 注意：这里不能加 opacity/transform 类动画，否则会形成 stacking context，语言下拉会被后面的输入面板盖住 -->
          <div class="relative z-10 flex flex-wrap items-center gap-2">
            <LanguageSelect
              v-model="sourceLang"
              :options="[
                { id: 'auto', name: 'Auto Detect', flag: '🔍' },
                ...SUPPORTED_LANGUAGES.map((lang) => ({
                  id: lang.code,
                  name: lang.name,
                  flag: lang.flag,
                })),
              ]"
            />

            <button
              :disabled="sourceLang.id === 'auto'"
              class="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 transition-colors disabled:cursor-not-allowed hover:bg-neutral-200 dark:text-neutral-400 disabled:opacity-50 dark:hover:bg-neutral-800"
              title="Swap languages"
              aria-label="Swap languages"
              @click="swapLanguages"
            >
              <i class="i-tabler-arrows-exchange h-4 w-4" />
            </button>

            <LanguageSelect
              v-model="targetLang"
              :options="
                SUPPORTED_LANGUAGES.map((lang) => ({
                  id: lang.code,
                  name: lang.name,
                  flag: lang.flag,
                }))
              "
            />

            <SegmentedControl
              v-model="tone"
              :options="TONE_OPTIONS"
              class="ml-auto"
            />
          </div>

          <!-- Input panel, same surface as the chat input -->
          <div
            class="rounded-xl bg-neutral-100 transition-all dark:bg-elevated focus-within:bg-neutral-200 hover:bg-neutral-200 dark:focus-within:bg-elevated-hover dark:hover:bg-elevated-hover"
          >
            <textarea
              v-model="text"
              placeholder="Enter text to translate"
              style="resize: none; scrollbar-width: none"
              class="min-h-140px w-full border-none bg-transparent px-4 py-4 text-lg text-neutral-800 leading-relaxed outline-none dark:text-[#e3e3e3]"
            />
            <div class="flex items-center justify-between px-4 pb-3">
              <div class="flex items-center gap-3 text-xs text-neutral-400 dark:text-neutral-500">
                <span v-if="text.length > 0">{{ text.length }} chars</span>
                <span v-if="isTyping" class="flex items-center gap-1">
                  <i class="i-tabler-pencil h-3.5 w-3.5 animate-pulse" />
                  Typing…
                </span>
              </div>
              <button
                :disabled="!text && !translateContent"
                class="h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 transition-colors disabled:cursor-not-allowed hover:bg-neutral-200 dark:text-neutral-400 disabled:opacity-50 dark:hover:bg-neutral-700"
                title="Clear text"
                aria-label="Clear text"
                @click="clearContent"
              >
                <i class="i-tabler-eraser h-4 w-4" />
              </button>
            </div>
          </div>

          <!-- Translation output, rendered like an assistant message -->
          <div class="flex flex-col gap-2">
            <div class="h-8 flex items-center gap-2 text-sm text-neutral-400 font-medium">
              <i class="i-tabler-language h-4 w-4" />
              <span>{{ targetLanguage.name }}</span>
              <span
                v-if="loading"
                class="flex items-center gap-1 text-xs font-normal"
              >
                <i class="i-tabler-loader-2 h-3.5 w-3.5 animate-spin" />
                Translating…
              </span>
              <button
                v-if="translateContent && !loading"
                class="ml-auto h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
                :title="copied ? 'Copied' : 'Copy translation'"
                aria-label="Copy translation"
                @click="copyToClipboard(translateContent)"
              >
                <i
                  :class="copied ? 'i-tabler-check text-green-500' : 'i-tabler-copy'"
                  class="h-4 w-4"
                />
              </button>
            </div>

            <div
              v-if="!translateContent && !loading"
              class="py-4 text-sm text-neutral-400 dark:text-neutral-500"
            >
              {{
                text.length > 0
                  ? "Waiting for you to pause…"
                  : "The translation appears here."
              }}
            </div>
            <StreamContent
              v-else-if="translateContent"
              class="max-w-full text-lg leading-relaxed"
              :content="translateContent"
              :loading="false"
            />
          </div>

          <!-- Word explanations -->
          <div v-if="translateContent" class="flex flex-col gap-2">
            <div class="h-8 flex items-center gap-2 text-sm text-neutral-400 font-medium">
              <i class="i-tabler-vocabulary h-4 w-4" />
              <span>Word explanations</span>
              <button
                class="ml-auto h-8 w-8 flex items-center justify-center rounded-lg text-neutral-500 transition-colors hover:bg-neutral-200 dark:text-neutral-400 dark:hover:bg-neutral-800"
                :title="showWordExplain ? 'Hide explanations' : 'Show explanations'"
                :aria-label="showWordExplain ? 'Hide explanations' : 'Show explanations'"
                @click="showWordExplain = !showWordExplain"
              >
                <i
                  :class="showWordExplain ? 'i-tabler-eye-off' : 'i-tabler-eye'"
                  class="h-4 w-4"
                />
              </button>
            </div>
            <WordExplainPaper
              v-if="showWordExplain"
              :content="translateContent"
              :target-lang="targetLanguage.name"
              :translation-loading="loading"
            />
          </div>
        </div>
      </main>
    </MainContainer>
  </BaseContainer>
</template>
