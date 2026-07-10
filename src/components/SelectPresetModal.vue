<script setup lang="tsx">
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
      class="mx-4 max-w-sm w-full overflow-hidden border border-neutral-200 rounded-2xl bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#1a1a1a]"
    >
      <div
        class="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-neutral-800"
      >
        <h2 class="text-base text-neutral-800 font-semibold dark:text-white">
          Select a Preset
        </h2>
        <button
          class="h-8 w-8 flex items-center justify-center rounded-full text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
          @click="show = false"
        >
          <i class="i-tabler-x" />
        </button>
      </div>
      <div class="max-h-96 flex flex-col gap-0.5 overflow-y-auto p-3">
        <div
          v-for="p in presets"
          :key="p"
          class="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800"
          :class="
            platform === p
              ? 'text-neutral-900 font-medium bg-neutral-100 dark:text-white dark:bg-neutral-800'
              : 'text-neutral-600 dark:text-neutral-300'
          "
          @click="selectPreset(p)"
        >
          <span class="flex-shrink-0 text-lg leading-0">
            <component :is="() => getPlatformIcon(p)" />
          </span>
          <span>
            {{ getPlatformName(p) }}
          </span>
          <i
            v-if="platform === p"
            class="i-tabler-check ml-auto flex-shrink-0 text-blue-500"
          />
        </div>
      </div>
    </div>
  </Modal>
</template>
