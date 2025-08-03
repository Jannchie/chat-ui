<script setup lang="ts">
import { ref } from 'vue'
import { apiKey, customServiceUrl, model, platform } from '../shared'
import { getPlatformIcon, getPlatformName } from '../utils'
import CacheHistoryModal from './CacheHistoryModal.vue'
import SelectModelModal from './SelectModelModal.vue'
import SettingsModal from './SettingsModal.vue'

const showSelectModelModal = ref(false)
const showMobileMenu = ref(false)
const showSelectPresetModal = ref(false)
const showCacheHistoryModal = ref(false)
const showSettingsModal = ref(false)
</script>

<template>
  <header class="text-lg px-4 py-3 flex flex-shrink-0 gap-4 items-center justify-between lg:px-6 lg:h-72px">
    <!-- New Conversation Button for small screens -->
    <button
      class="dark:hover:bg-neutral-8 text-lg p-2 rounded-full flex hidden items-center justify-center hover:bg-neutral-100 lg:hidden"
      @click="$router.push('/')"
    >
      <i class="i-tabler-plus text-neutral-400" />
    </button>
    <!-- Model selection - visible on all devices -->
    <button
      class="text-sm font-medium px-3 py-2 rounded-full flex gap-2 cursor-pointer transition-colors items-center lg:px-4 lg:py-2.5 hover:bg-neutral-200 dark:hover:bg-neutral-800"
      @click="showSelectPresetModal = true"
    >
      <div class="text-lg leading-0">
        <component :is="() => getPlatformIcon(platform)" />
      </div>
      {{ getPlatformName(platform) }}
      <i class="i-tabler-chevron-down text-xs ml-1 opacity-60" />
    </button>

    <!-- Keep original SelectPresetModal -->
    <SelectPresetModal
      v-model="showSelectPresetModal"
    />

    <!-- Use the new SelectModelModal component -->
    <SelectModelModal
      v-model="showSelectModelModal"
      v-model:selected-model="model"
    />

    <!-- Cache History Modal -->
    <CacheHistoryModal
      v-model="showCacheHistoryModal"
    />

    <SettingsModal
      v-model="showSettingsModal"
    />

    <!-- Desktop view - row of inputs -->
    <div class="hidden lg:flex lg:gap-3">
      <div
        v-if="platform === 'custom'"
        class="flex gap-2 items-center"
      >
        <div class="text-lg pr-2 flex items-center">
          <i class="i-tabler-link text-green-400" />
          <span class="text-sm font-medium pl-2">Service URL</span>
        </div>
        <input
          v-model="customServiceUrl"
          placeholder="Service URL"
          class="text-sm text-neutral-700 px-6 py-2 outline-none rounded-full bg-neutral-200 w-36 transition-all dark:text-[#e3e3e3] focus:border-green-500/50 dark:bg-[#1e1e1f] focus:ring-2 focus:ring-green-500/20"
          type="text"
        >
      </div>

      <div class="flex gap-2 items-center">
        <div class="text-lg pr-2 flex items-center">
          <i class="i-tabler-cube text-purple-400" />
          <span class="text-sm font-medium pl-2">Model</span>
        </div>
        <!-- Replace input with button to show model selection modal -->
        <button
          class="text-sm text-neutral-700 px-6 py-2 rounded-full bg-neutral-200 flex min-w-36 transition-all items-center justify-between dark:text-[#e3e3e3] focus:border-neutral-500/50 dark:bg-[#1e1e1f] hover:bg-neutral-300 focus:ring-2 focus:ring-neutral-500/20 dark:hover:bg-[#252526]"
          @click="showSelectModelModal = true"
        >
          <span class="pr-2 truncate">{{ model || 'Select Model' }}</span>
          <i class="i-tabler-chevron-down text-xs opacity-60" />
        </button>
      </div>

      <div class="flex gap-2 items-center">
        <div class="text-lg pr-2 flex items-center">
          <i class="i-tabler-key text-blue-400" />
          <span class="text-sm font-medium pl-2">API Key</span>
        </div>
        <input
          v-model="apiKey"
          placeholder="API Key"
          class="text-sm text-neutral-700 px-6 py-2 outline-none rounded-full bg-neutral-200 w-36 transition-all dark:text-[#e3e3e3] focus:border-blue-500/50 dark:bg-[#1e1e1f] focus:ring-2 focus:ring-blue-500/20"
          type="password"
        >
      </div>

      <!-- Cache History Button -->
      <div class="flex items-center">
        <button
          class="dark:hover:bg-neutral-8 text-lg p-2 rounded-full flex transition-colors items-center justify-center hover:bg-neutral-100"
          title="Cache History"
          @click="showCacheHistoryModal = true"
        >
          <i class="i-tabler-history text-neutral-400" />
        </button>
        <button
          class="dark:hover:bg-neutral-8 text-lg p-2 rounded-full flex transition-colors items-center justify-center hover:bg-neutral-100"
          title="Settings"
          @click="showSettingsModal = true"
        >
          <i class="i-tabler-settings text-neutral-400" />
        </button>
      </div>
    </div>

    <!-- Mobile view - menu toggle -->
    <button
      class="dark:hover:bg-neutral-8 text-lg p-2 rounded-full flex items-center justify-center hover:bg-neutral-100 lg:hidden"
      @click="showMobileMenu = !showMobileMenu"
    >
      <i class="i-tabler-settings text-neutral-400" />
    </button>

    <!-- Mobile menu drawer -->
    <div
      v-if="showMobileMenu"
      class="bg-black/50 inset-0 fixed z-50 lg:hidden"
      @click.self="showMobileMenu = false"
    >
      <div class="p-4 bg-[#121212] h-full w-64 shadow-lg right-0 top-0 absolute">
        <div class="mb-6 flex items-center justify-between">
          <h3 class="text-lg font-medium">
            Settings
          </h3>
          <button
            class="hover:bg-neutral-8 p-1 rounded-full"
            @click="showMobileMenu = false"
          >
            <i class="i-tabler-x text-lg" />
          </button>
        </div>

        <div class="flex flex-col gap-6">
          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium flex gap-2 items-center">
              <i class="i-tabler-key text-blue-400" />
              API Key
            </label>
            <input
              v-model="apiKey"
              placeholder="API Key"
              class="text-sm text-neutral-700 px-4 py-2 outline-none rounded-lg bg-neutral-200 w-full transition-all dark:text-[#e3e3e3] focus:border-blue-500/50 dark:bg-[#1e1e1f] focus:ring-2 focus:ring-blue-500/20"
              type="password"
            >
          </div>

          <div
            v-if="platform === 'custom'"
            class="flex flex-col gap-2"
          >
            <label class="text-sm font-medium flex gap-2 items-center">
              <i class="i-tabler-link text-green-400" />
              Service URL
            </label>
            <input
              v-model="customServiceUrl"
              placeholder="Service URL"
              class="text-sm text-neutral-700 px-4 py-2 outline-none rounded-lg bg-neutral-200 w-full transition-all dark:text-[#e3e3e3] focus:border-green-500/50 dark:bg-[#1e1e1f] focus:ring-2 focus:ring-green-500/20"
              type="text"
            >
          </div>

          <div class="flex flex-col gap-2">
            <label class="text-sm font-medium flex gap-2 items-center">
              <i class="i-tabler-cube text-purple-400" />
              Model
            </label>
            <!-- Replace input with button to show model selection modal in mobile menu -->
            <button
              class="text-sm text-neutral-700 px-4 py-2 rounded-lg bg-neutral-200 flex w-full transition-all items-center justify-between dark:text-[#e3e3e3] focus:border-neutral-500/50 dark:bg-[#1e1e1f] hover:bg-neutral-300 focus:ring-2 focus:ring-neutral-500/20 dark:hover:bg-[#252526]"
              @click="showSelectModelModal = true; showMobileMenu = false"
            >
              <span class="truncate">{{ model || 'Select Model' }}</span>
              <i class="i-tabler-chevron-down text-xs opacity-60" />
            </button>
          </div>

          <!-- Cache History Button -->
          <div class="flex justify-center">
            <button
              class="hover:bg-neutral-7 text-sm font-medium px-4 py-2 rounded-lg flex gap-2 transition-colors items-center justify-center"
              @click="showCacheHistoryModal = true; showMobileMenu = false"
            >
              <i class="i-tabler-history text-neutral-400" />
              Cache History
            </button>
          </div>
        </div>
      </div>
    </div>
  </header>
</template>
