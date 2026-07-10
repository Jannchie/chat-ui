<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: 'sm' | 'md'
    variant?: 'light'
    // 'surface' 用中性色；十六进制色值用同色 10% 透明度作底
    color?: string
  }>(),
  {
    size: 'md',
    variant: 'light',
    color: 'surface',
  },
)

const isHexColor = computed(() => props.color.startsWith('#'))
const hexStyle = computed(() => {
  if (!isHexColor.value) {
    return
  }
  return {
    backgroundColor: `${props.color}1a`,
    color: props.color,
  }
})
</script>

<template>
  <span
    class="inline-flex items-center gap-1 whitespace-nowrap rounded-full"
    :class="[
      size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
      isHexColor
        ? ''
        : 'bg-neutral-200/70 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
    ]"
    :style="hexStyle"
  >
    <slot name="leftSection" />
    <slot />
  </span>
</template>
