<script setup lang="tsx">
import { currentPreset, platform } from '../shared'
import { getPlatformIcon, getPlatformName } from '../utils'

const presets = [
  'openai',
  'anthropic',
  'pfn',
  'openrouter',
  'custom',
]

const show = defineModel<boolean>()
const modalRef = ref<HTMLElement | null>(null)

onClickOutside(modalRef, () => {
  show.value = false
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition ease-in"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="bg-black/50 flex items-center inset-0 justify-center fixed z-50"
      >
        <div
          ref="modalRef"
          class="bg-neutral-9 p-4 pt-6 rounded-3xl w-96 shadow-lg top-10rem absolute"
        >
          <div class="text-neutral-2 text-lg font-bold mb-4 px-2">
            Select a Preset
          </div>
          <div class="flex flex-col gap-2 max-h-80 overflow-auto">
            <div
              v-for="p in presets"
              :key="p"
              class="hover:bg-neutral-7 text-sm font-medium px-3 py-2 rounded-full flex gap-4 cursor-pointer transition-all items-center hover:shadow-sm"
              :class="{
                'bg-neutral-8': platform === p,
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
      </div>
    </Transition>
  </Teleport>
</template>
