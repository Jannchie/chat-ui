<script setup lang="ts">
import { computed, onBeforeUnmount, ref, toRaw } from 'vue'
import {
  apiKey,
  asideOpen,
  customServiceUrl,
  model,
  platform,
  useCurrentChat,
} from '../shared'
import { getPlatformIcon, getPlatformName } from '../utils'
import { serializeChatForExport } from '../utils/chatExport'
import CacheHistoryModal from './CacheHistoryModal.vue'
import SelectModelModal from './SelectModelModal.vue'
import SettingsModal from './SettingsModal.vue'

type CopyStatus = 'idle' | 'success' | 'error'

const showSelectModelModal = ref(false)
const showMobileMenu = ref(false)
const showSelectPresetModal = ref(false)
const showCacheHistoryModal = ref(false)
const showSettingsModal = ref(false)
const currentChat = useCurrentChat()
const copyStatus = ref<CopyStatus>('idle')
const copyTooltipTimeout = ref<ReturnType<typeof globalThis.setTimeout>>()

const clipboardSupported = computed(() => {
  return (
    typeof navigator !== 'undefined'
    && Boolean(navigator.clipboard)
    && typeof navigator.clipboard.writeText === 'function'
  )
})

const canCopyChatJson = computed(() => {
  return clipboardSupported.value && Boolean(currentChat.value)
})

const copyButtonTitle = computed(() => {
  if (copyStatus.value === 'success') {
    return 'Copied'
  }
  if (copyStatus.value === 'error') {
    return 'Copy failed'
  }
  return 'Copy Chat JSON'
})

const copyButtonIcon = computed(() => {
  if (copyStatus.value === 'success') {
    return 'i-tabler-check'
  }
  if (copyStatus.value === 'error') {
    return 'i-tabler-x'
  }
  return 'i-tabler-code'
})

function clearCopyTooltipTimeout() {
  if (copyTooltipTimeout.value !== undefined) {
    globalThis.clearTimeout(copyTooltipTimeout.value)
    copyTooltipTimeout.value = undefined
  }
}

function setCopyStatus(status: CopyStatus) {
  copyStatus.value = status
  clearCopyTooltipTimeout()

  if (status !== 'idle') {
    copyTooltipTimeout.value = globalThis.setTimeout(() => {
      copyStatus.value = 'idle'
      copyTooltipTimeout.value = undefined
    }, 2000)
  }
}

async function copyChatJson() {
  if (!canCopyChatJson.value || !currentChat.value) {
    return
  }

  try {
    const rawChat = toRaw(currentChat.value)
    const exportedChat = serializeChatForExport(rawChat)
    await navigator.clipboard.writeText(JSON.stringify(exportedChat, null, 2))
    setCopyStatus('success')
  }
  catch (error) {
    console.error(`Failed to copy chat JSON: ${error}`)
    setCopyStatus('error')
  }
}

onBeforeUnmount(() => {
  clearCopyTooltipTimeout()
})
</script>

<template>
  <header
    class="flex flex-shrink-0 items-center justify-between gap-4 px-4 py-3 text-lg lg:h-72px lg:px-6"
  >
    <!-- Chat list drawer toggle for small screens -->
    <button
      class="flex items-center justify-center rounded-full p-2 text-lg lg:hidden hover:bg-neutral-100 dark:hover:bg-neutral-800"
      aria-label="Open chat list"
      title="Open chat list"
      @click="asideOpen = true"
    >
      <i class="i-tabler-menu-2 text-neutral-400" />
    </button>
    <div class="min-w-0 flex items-center gap-2">
      <!-- Model selection - visible on all devices -->
      <button
        class="flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-neutral-200 lg:px-4 lg:py-2.5 dark:hover:bg-neutral-800"
        @click="showSelectPresetModal = true"
      >
        <div class="text-lg leading-0">
          <component :is="() => getPlatformIcon(platform)" />
        </div>
        {{ getPlatformName(platform) }}
        <i class="i-tabler-chevron-down ml-1 text-xs opacity-60" />
      </button>

      <button
        v-if="currentChat"
        :class="{
          'text-green-500': copyStatus === 'success',
          'text-red-500': copyStatus === 'error',
          'opacity-50 cursor-not-allowed': !canCopyChatJson,
        }"
        :disabled="!canCopyChatJson"
        :title="copyButtonTitle"
        class="hidden items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors lg:flex hover:bg-neutral-200 dark:hover:bg-neutral-800"
        @click="copyChatJson"
      >
        <i :class="copyButtonIcon" class="text-base" />
        <span>Copy JSON</span>
      </button>
    </div>

    <!-- Keep original SelectPresetModal -->
    <SelectPresetModal v-model="showSelectPresetModal" />

    <!-- Use the new SelectModelModal component -->
    <SelectModelModal
      v-model="showSelectModelModal"
      v-model:selected-model="model"
    />

    <!-- Cache History Modal -->
    <CacheHistoryModal v-model="showCacheHistoryModal" />

    <SettingsModal v-model="showSettingsModal" />

    <!-- Desktop view - row of inputs -->
    <div class="hidden lg:flex lg:gap-3">
      <div v-if="platform === 'custom'" class="flex items-center gap-2">
        <div class="flex items-center pr-2 text-lg">
          <i class="i-tabler-link text-green-400" />
          <span class="pl-2 text-sm font-medium">Service URL</span>
        </div>
        <input
          v-model="customServiceUrl"
          placeholder="Service URL"
          class="w-36 rounded-full bg-neutral-200 px-6 py-2 text-sm text-neutral-700 outline-none transition-all focus:border-green-500/50 dark:bg-elevated dark:text-[#e3e3e3] focus:ring-2 focus:ring-green-500/20"
          type="text"
        >
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center pr-2 text-lg">
          <i class="i-tabler-cube text-purple-400" />
          <span class="pl-2 text-sm font-medium">Model</span>
        </div>
        <!-- Replace input with button to show model selection modal -->
        <button
          class="min-w-36 flex items-center justify-between rounded-full bg-neutral-200 px-6 py-2 text-sm text-neutral-700 transition-all focus:border-neutral-500/50 dark:bg-elevated hover:bg-neutral-300 dark:text-[#e3e3e3] focus:ring-2 focus:ring-neutral-500/20 dark:hover:bg-elevated-hover"
          @click="showSelectModelModal = true"
        >
          <span class="truncate pr-2">{{ model || "Select Model" }}</span>
          <i class="i-tabler-chevron-down text-xs opacity-60" />
        </button>
      </div>

      <div class="flex items-center gap-2">
        <div class="flex items-center pr-2 text-lg">
          <i class="i-tabler-key text-blue-400" />
          <span class="pl-2 text-sm font-medium">API Key</span>
        </div>
        <input
          v-model="apiKey"
          placeholder="API Key"
          class="w-36 rounded-full bg-neutral-200 px-6 py-2 text-sm text-neutral-700 outline-none transition-all focus:border-blue-500/50 dark:bg-elevated dark:text-[#e3e3e3] focus:ring-2 focus:ring-blue-500/20"
          type="password"
        >
      </div>

      <!-- Header actions -->
      <div class="flex items-center">
        <button
          class="flex items-center justify-center rounded-full p-2 text-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:bg-neutral-8"
          title="Cache History"
          @click="showCacheHistoryModal = true"
        >
          <i class="i-tabler-history text-neutral-400" />
        </button>
        <button
          class="flex items-center justify-center rounded-full p-2 text-lg transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700 dark:hover:bg-neutral-8"
          title="Settings"
          @click="showSettingsModal = true"
        >
          <i class="i-tabler-settings text-neutral-400" />
        </button>
      </div>
    </div>

    <!-- Mobile view - menu toggle -->
    <div class="flex items-center gap-1 lg:hidden">
      <button
        class="flex items-center justify-center rounded-full p-2 text-lg hover:bg-neutral-100 dark:hover:bg-neutral-8"
        @click="showMobileMenu = !showMobileMenu"
      >
        <i class="i-tabler-settings text-neutral-400" />
      </button>
    </div>

    <!-- Mobile menu drawer -->
    <div
      v-if="showMobileMenu"
      class="fixed inset-0 z-50 bg-black/50 lg:hidden"
      @click.self="showMobileMenu = false"
    >
      <div
        class="absolute right-0 top-0 h-full w-64 bg-[#121212] p-4 shadow-lg"
      >
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-lg font-medium">
            Settings
          </h3>
          <button
            class="rounded-full p-1 hover:bg-neutral-8"
            @click="showMobileMenu = false"
          >
            <i class="i-tabler-x text-lg" />
          </button>
        </div>

        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-sm font-medium">
              <i class="i-tabler-key text-blue-400" />
              API Key
            </label>
            <input
              v-model="apiKey"
              placeholder="API Key"
              class="w-full rounded-lg bg-neutral-200 px-4 py-2 text-sm text-neutral-700 outline-none transition-all focus:border-blue-500/50 dark:bg-elevated dark:text-[#e3e3e3] focus:ring-2 focus:ring-blue-500/20"
              type="password"
            >
          </div>

          <div v-if="platform === 'custom'" class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-sm font-medium">
              <i class="i-tabler-link text-green-400" />
              Service URL
            </label>
            <input
              v-model="customServiceUrl"
              placeholder="Service URL"
              class="w-full rounded-lg bg-neutral-200 px-4 py-2 text-sm text-neutral-700 outline-none transition-all focus:border-green-500/50 dark:bg-elevated dark:text-[#e3e3e3] focus:ring-2 focus:ring-green-500/20"
              type="text"
            >
          </div>

          <div class="flex flex-col gap-2">
            <label class="flex items-center gap-2 text-sm font-medium">
              <i class="i-tabler-cube text-purple-400" />
              Model
            </label>
            <!-- Replace input with button to show model selection modal in mobile menu -->
            <button
              class="w-full flex items-center justify-between rounded-lg bg-neutral-200 px-4 py-2 text-sm text-neutral-700 transition-all focus:border-neutral-500/50 dark:bg-elevated hover:bg-neutral-300 dark:text-[#e3e3e3] focus:ring-2 focus:ring-neutral-500/20 dark:hover:bg-elevated-hover"
              @click="
                showSelectModelModal = true;
                showMobileMenu = false;
              "
            >
              <span class="truncate">{{ model || "Select Model" }}</span>
              <i class="i-tabler-chevron-down text-xs opacity-60" />
            </button>
          </div>

          <!-- Cache History Button -->
          <div class="flex justify-center">
            <button
              class="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-7"
              @click="
                showCacheHistoryModal = true;
                showMobileMenu = false;
              "
            >
              <i class="i-tabler-history text-neutral-400" />
              Cache History
            </button>
          </div>

          <div v-if="currentChat" class="flex justify-center">
            <button
              :class="{
                'text-green-500': copyStatus === 'success',
                'text-red-500': copyStatus === 'error',
                'opacity-50 cursor-not-allowed': !canCopyChatJson,
              }"
              :disabled="!canCopyChatJson"
              class="flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors hover:bg-neutral-7"
              @click="
                copyChatJson();
                showMobileMenu = false;
              "
            >
              <i :class="copyButtonIcon" />
              Copy Chat JSON
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
