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
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      >
        <div
          ref="modalRef"
          class="absolute top-10rem w-96 rounded-3xl bg-neutral-9 p-4 pt-6 shadow-lg"
        >
          <div class="mb-4 px-2 text-lg text-neutral-2 font-bold">
            Select a Preset
          </div>
          <div class="max-h-80 flex flex-col gap-2 overflow-auto">
            <div
              v-for="p in presets"
              :key="p"
              class="flex cursor-pointer items-center gap-4 rounded-full px-3 py-2 text-sm font-medium transition-all hover:bg-neutral-7 hover:shadow-sm"
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
