<script setup lang="ts">
import { loadKatex, loadShiki, md } from '../utils'

const { content } = defineProps<{
  content: string
}>()

const result = computed(() => {
  // Check if content contains code blocks and load Shiki if needed
  if (content.includes('```') || content.includes('`')) {
    loadShiki()
  }

  // Check if content contains math expressions and load KaTeX if needed
  if (content.includes('$') || content.includes(String.raw`\(`) || content.includes(String.raw`\[`)) {
    loadKatex()
  }

  return md.render(content)
})
</script>

<template>
  <div
    key="prose"
    class="prose children:mt-0"
  >
    <component :is="() => result" />
  </div>
</template>
