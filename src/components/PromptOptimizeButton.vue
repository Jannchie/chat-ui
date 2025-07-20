<script setup lang="ts">
import type { PromptOptimizationOptions } from '../composables/usePromptOptimizer'
import { usePromptOptimizer } from '../composables/usePromptOptimizer'

interface Props {
  modelValue: string
  disabled?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'ghost' | 'outline'
}

interface Emits {
  (e: 'update:modelValue', value: string): void
  (e: 'optimized', optimizedPrompt: string): void
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
  size: 'md',
  variant: 'ghost',
})

const emit = defineEmits<Emits>()

const { isOptimizing, optimizationError, optimizePrompt } = usePromptOptimizer()

const showOptionsModal = ref(false)
const optimizationOptions = ref<PromptOptimizationOptions>({
  style: 'professional',
  purpose: 'general',
  language: 'auto-detect',
})

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-10 w-10',
}

const iconSizeClasses = {
  sm: 'h-3 w-3',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
}

const variantClasses = {
  default: 'bg-blue-500/20 text-blue-400',
  ghost: 'color-[#c4c7c5]',
  outline: 'border border-neutral-6 color-[#c4c7c5]',
}

const hoverClasses = {
  default: 'hover:bg-blue-500/30',
  ghost: 'hover:bg-neutral-7',
  outline: 'hover:bg-neutral-7',
}

async function handleOptimize(withOptions = false) {
  if (props.disabled || !props.modelValue.trim()) {
    return
  }

  if (withOptions) {
    showOptionsModal.value = true
    return
  }

  const optimizedPrompt = await optimizePrompt(props.modelValue, optimizationOptions.value)

  if (optimizedPrompt) {
    emit('update:modelValue', optimizedPrompt)
    emit('optimized', optimizedPrompt)
  }
}

async function handleOptimizeWithOptions() {
  showOptionsModal.value = false
  const optimizedPrompt = await optimizePrompt(props.modelValue, optimizationOptions.value)

  if (optimizedPrompt) {
    emit('update:modelValue', optimizedPrompt)
    emit('optimized', optimizedPrompt)
  }
}
</script>

<template>
  <div class="relative">
    <!-- Main optimize button -->
    <button
      :disabled="disabled || isOptimizing || !modelValue.trim()"
      class="flex items-center justify-center rounded-lg transition-all"
      :class="[
        sizeClasses[size],
        variantClasses[variant],
        {
          'opacity-50 cursor-not-allowed': disabled || !modelValue.trim(),
          'animate-pulse': isOptimizing,
          [hoverClasses[variant]]: !disabled && modelValue.trim() && !isOptimizing,
        },
      ]"
      :title="isOptimizing ? 'Optimizing...' : 'Optimize Prompt'"
      @click="handleOptimize()"
      @contextmenu.prevent="handleOptimize(true)"
    >
      <i
        v-if="!isOptimizing"
        class="i-tabler-wand"
        :class="[iconSizeClasses[size]]"
      />
      <i
        v-else
        class="i-tabler-loader-2 animate-spin"
        :class="[iconSizeClasses[size]]"
      />
    </button>

    <!-- Options Modal -->
    <Teleport to="body">
      <div
        v-if="showOptionsModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
        @click.self="showOptionsModal = false"
      >
        <div class="max-w-[90vw] w-96 border border-neutral-6 rounded-xl bg-neutral-8 p-6">
          <h3 class="mb-4 text-lg text-neutral-1 font-medium">
            Optimization Options
          </h3>

          <div class="space-y-4">
            <!-- Style Selection -->
            <div>
              <label class="mb-2 block text-sm text-neutral-3 font-medium">
                Style
              </label>
              <select
                v-model="optimizationOptions.style"
                class="w-full border border-neutral-6 rounded-lg bg-neutral-7 px-3 py-2 text-neutral-1"
              >
                <option value="professional">
                  Professional
                </option>
                <option value="casual">
                  Casual
                </option>
                <option value="concise">
                  Concise
                </option>
                <option value="detailed">
                  Detailed
                </option>
              </select>
            </div>

            <!-- Purpose Selection -->
            <div>
              <label class="mb-2 block text-sm text-neutral-3 font-medium">
                Purpose
              </label>
              <select
                v-model="optimizationOptions.purpose"
                class="w-full border border-neutral-6 rounded-lg bg-neutral-7 px-3 py-2 text-neutral-1"
              >
                <option value="general">
                  General
                </option>
                <option value="coding">
                  Coding
                </option>
                <option value="creative">
                  Creative
                </option>
                <option value="analysis">
                  Analysis
                </option>
              </select>
            </div>

            <!-- Language Selection -->
            <div>
              <label class="mb-2 block text-sm text-neutral-3 font-medium">
                Language
              </label>
              <select
                v-model="optimizationOptions.language"
                class="w-full border border-neutral-6 rounded-lg bg-neutral-7 px-3 py-2 text-neutral-1"
              >
                <option value="auto-detect">
                  Auto-detect
                </option>
                <option value="English">
                  English
                </option>
                <option value="Chinese">
                  中文
                </option>
                <option value="Japanese">
                  日本語
                </option>
                <option value="Korean">
                  한국어
                </option>
              </select>
            </div>
          </div>

          <!-- Error Display -->
          <div
            v-if="optimizationError"
            class="mt-4 border border-red-500/30 rounded-lg bg-red-500/20 p-3 text-sm text-red-400"
          >
            {{ optimizationError }}
          </div>

          <!-- Action Buttons -->
          <div class="mt-6 flex gap-3">
            <button
              class="flex-1 rounded-lg bg-neutral-7 px-4 py-2 text-neutral-1 transition-colors hover:bg-neutral-6"
              @click="showOptionsModal = false"
            >
              Cancel
            </button>
            <button
              :disabled="isOptimizing || !modelValue.trim()"
              class="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors disabled:cursor-not-allowed hover:bg-blue-600 disabled:opacity-50"
              @click="handleOptimizeWithOptions"
            >
              <span v-if="!isOptimizing">Optimize</span>
              <span
                v-else
                class="flex items-center justify-center gap-2"
              >
                <i class="i-tabler-loader-2 h-4 w-4 animate-spin" />
                Optimizing...
              </span>
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>
