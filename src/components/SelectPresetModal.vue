<script setup lang="tsx">
import { Modal } from '@roku-ui/vue'
import { currentPreset, platform } from '../shared'
import { getPlatformIcon, getPlatformName } from '../utils'

const presets = [
  'openai',
  'deepseek',
  'anthropic',
  'pfn',
  'openrouter',
  'zhipu',
  'custom',
]

const show = defineModel<boolean>()

function selectPreset(p: string) {
  platform.value = p
  currentPreset.value = p
  show.value = false
}
</script>

<template>
  <Modal v-model="show">
    <div
      class="mx-4 border border-neutral-200 rounded-2xl bg-white max-w-sm w-full shadow-2xl overflow-hidden dark:border-neutral-800 dark:bg-[#1a1a1a]"
    >
      <div
        class="px-5 py-4 border-b border-neutral-200 flex items-center justify-between dark:border-neutral-800"
      >
        <h2 class="text-base text-neutral-800 font-semibold dark:text-white">
          Select a Preset
        </h2>
        <button
          class="text-neutral-400 rounded-full flex h-8 w-8 transition-colors items-center justify-center hover:text-neutral-700 hover:bg-neutral-200 dark:hover:text-white dark:hover:bg-neutral-800"
          @click="show = false"
        >
          <i class="i-tabler-x" />
        </button>
      </div>
      <div class="p-3 flex flex-col gap-0.5 max-h-96 overflow-y-auto">
        <div
          v-for="p in presets"
          :key="p"
          class="text-sm px-3 py-2.5 rounded-lg flex gap-3 cursor-pointer transition-colors items-center hover:bg-neutral-100 dark:hover:bg-neutral-800"
          :class="
            platform === p
              ? 'text-neutral-900 font-medium bg-neutral-100 dark:text-white dark:bg-neutral-800'
              : 'text-neutral-600 dark:text-neutral-300'
          "
          @click="selectPreset(p)"
        >
          <span class="text-lg leading-0 flex-shrink-0">
            <component :is="() => getPlatformIcon(p)" />
          </span>
          <span>
            {{ getPlatformName(p) }}
          </span>
          <i
            v-if="platform === p"
            class="i-tabler-check text-blue-500 ml-auto flex-shrink-0"
          />
        </div>
      </div>
    </div>
  </Modal>
</template>
