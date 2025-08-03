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
  ghost: 'hover:bg-neutral-200 dark:hover:bg-neutral-7',
  outline: 'hover:bg-neutral-200 dark:hover:bg-neutral-7',
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
      class="rounded-lg flex transition-all items-center justify-center"
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
        class="bg-black/50 flex items-center inset-0 justify-center fixed z-50"
        @click.self="showOptionsModal = false"
      >
        <div class="dark:border-neutral-6 p-6 border border-neutral-300 rounded-xl bg-neutral-100 max-w-[90vw] w-96 dark:bg-neutral-800">
          <h3 class="dark:text-neutral-1 text-lg text-neutral-800 font-medium mb-4">
            Optimization Options
          </h3>

          <div class="space-y-4">
            <!-- Style Selection -->
            <div>
              <label class="text-neutral-3 text-sm font-medium mb-2 block">
                Style
              </label>
              <select
                v-model="optimizationOptions.style"
                class="dark:text-neutral-1 dark:bg-neutral-7 dark:border-neutral-6 text-neutral-800 px-3 py-2 border border-neutral-400 rounded-lg bg-neutral-200 w-full"
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
              <label class="text-neutral-3 text-sm font-medium mb-2 block">
                Purpose
              </label>
              <select
                v-model="optimizationOptions.purpose"
                class="dark:text-neutral-1 dark:bg-neutral-7 dark:border-neutral-6 text-neutral-800 px-3 py-2 border border-neutral-400 rounded-lg bg-neutral-200 w-full"
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
              <label class="text-neutral-3 text-sm font-medium mb-2 block">
                Language
              </label>
              <select
                v-model="optimizationOptions.language"
                class="dark:text-neutral-1 dark:bg-neutral-7 dark:border-neutral-6 text-neutral-800 px-3 py-2 border border-neutral-400 rounded-lg bg-neutral-200 w-full"
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
            class="text-sm text-red-400 mt-4 p-3 border border-red-500/30 rounded-lg bg-red-500/20"
          >
            {{ optimizationError }}
          </div>

          <!-- Action Buttons -->
          <div class="mt-6 flex gap-3">
            <button
              class="dark:text-neutral-1 dark:bg-neutral-7 dark:hover:bg-neutral-6 text-neutral-800 px-4 py-2 rounded-lg bg-neutral-300 flex-1 transition-colors hover:bg-neutral-400"
              @click="showOptionsModal = false"
            >
              Cancel
            </button>
            <button
              :disabled="isOptimizing || !modelValue.trim()"
              class="text-white px-4 py-2 rounded-lg bg-blue-500 flex-1 transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              @click="handleOptimizeWithOptions"
            >
              <span v-if="!isOptimizing">Optimize</span>
              <span
                v-else
                class="flex gap-2 items-center justify-center"
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
