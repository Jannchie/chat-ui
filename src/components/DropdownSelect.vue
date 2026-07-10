<script setup lang="ts" generic="T extends Record<string, any>">
const props = withDefaults(
  defineProps<{
    options: readonly T[]
    labelKey?: string
    placeholder?: string
    // 触发器贴近视口底部时向上展开
    direction?: 'up' | 'down'
  }>(),
  {
    labelKey: 'label',
    placeholder: 'Select',
    direction: 'down',
  },
)

const model = defineModel<T>()

const open = ref(false)
const rootRef = ref<HTMLElement | null>(null)

function labelOf(option: T): string {
  return String(option[props.labelKey])
}

function select(option: T) {
  model.value = option
  open.value = false
}

onClickOutside(rootRef, () => {
  open.value = false
})
</script>

<template>
  <div ref="rootRef" class="relative">
    <button
      class="w-full flex items-center justify-between gap-1 rounded-lg bg-neutral-200 px-2.5 py-1.5 transition-colors dark:bg-elevated hover:bg-neutral-300 dark:hover:bg-elevated-hover"
      @click="open = !open"
    >
      <span class="truncate" :class="{ 'opacity-60': !model }">
        {{ model ? labelOf(model) : placeholder }}
      </span>
      <i class="i-tabler-chevron-down h-3 w-3 flex-shrink-0 opacity-60" />
    </button>

    <div
      v-if="open"
      class="absolute z-50 min-w-full overflow-hidden border border-neutral-200 rounded-lg bg-white py-1 shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
      :class="direction === 'up' ? 'bottom-full mb-1' : 'top-full mt-1'"
    >
      <button
        v-for="option in options"
        :key="labelOf(option)"
        class="w-full flex items-center justify-between gap-2 px-2.5 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
        :class="{ 'text-blue-500 dark:text-blue-300': option === model }"
        @click="select(option)"
      >
        <span class="truncate">{{ labelOf(option) }}</span>
        <i v-if="option === model" class="i-tabler-check h-3 w-3 flex-shrink-0" />
      </button>
    </div>
  </div>
</template>
