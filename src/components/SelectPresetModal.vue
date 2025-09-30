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
</script>

<template>
  <Modal v-model="show">
    <div
      class="p-4 pt-6 rounded-3xl bg-neutral-100 w-96 shadow-lg dark:bg-neutral-900"
    >
      <div class="text-lg text-neutral-800 font-bold mb-4 px-2 dark:text-neutral-200">
        Select a Preset
      </div>
      <div class="flex flex-col gap-2 max-h-80 overflow-auto">
        <div
          v-for="p in presets"
          :key="p"
          class="text-sm font-medium px-3 py-2 rounded-full flex gap-4 cursor-pointer transition-all items-center hover:bg-neutral-200 hover:shadow-sm dark:hover:bg-neutral-700"
          :class="{
            'bg-blue-200 text-blue-500 dark:text-neutral-200 dark:bg-neutral-800': platform === p,
          }"
          @click="platform = p; currentPreset = p; show = false"
        >
          <component :is="() => getPlatformIcon(p)" />
          <span>
            {{ getPlatformName(p) }}
          </span>
        </div>
      </div>
    </div>
  </Modal>
</template>
