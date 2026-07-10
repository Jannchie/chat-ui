<script setup lang="ts">
interface LanguageOption {
  id: string
  name: string
  flag: string
}

const props = defineProps<{
  options: LanguageOption[]
}>()

const model = defineModel<LanguageOption>({ required: true })

const open = ref(false)
const search = ref('')
const rootRef = ref<HTMLElement | null>(null)
const searchRef = ref<HTMLInputElement | null>(null)

const filtered = computed(() => {
  const query = search.value.trim().toLowerCase()
  if (!query) {
    return props.options
  }
  return props.options.filter(
    option =>
      option.name.toLowerCase().includes(query)
      || option.id.toLowerCase().includes(query),
  )
})

function toggle() {
  open.value = !open.value
  if (open.value) {
    search.value = ''
    nextTick(() => searchRef.value?.focus())
  }
}

function select(option: LanguageOption) {
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
      class="flex items-center gap-2 rounded-full py-1.5 pl-3 pr-2 text-sm font-medium transition-colors hover:bg-neutral-200 dark:hover:bg-neutral-800"
      :class="{ 'bg-neutral-200 dark:bg-neutral-800': open }"
      @click="toggle"
    >
      <span class="leading-none">{{ model.flag }}</span>
      <span>{{ model.name }}</span>
      <i class="i-tabler-chevron-down text-xs opacity-60" />
    </button>

    <div
      v-if="open"
      class="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden border border-neutral-200 rounded-xl bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-800"
    >
      <div class="border-b border-neutral-200 p-2 dark:border-neutral-700">
        <input
          ref="searchRef"
          v-model="search"
          placeholder="Search language"
          class="w-full rounded-lg bg-neutral-100 px-3 py-1.5 text-sm outline-none dark:bg-neutral-900 placeholder:text-neutral-400"
          @keydown.esc="open = false"
        >
      </div>
      <div class="max-h-64 overflow-y-auto py-1" style="scrollbar-width: thin">
        <button
          v-for="option in filtered"
          :key="option.id"
          class="w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-700"
          :class="{ 'text-blue-500 dark:text-blue-300': option.id === model.id }"
          @click="select(option)"
        >
          <span>{{ option.flag }}</span>
          <span class="flex-grow">{{ option.name }}</span>
          <i v-if="option.id === model.id" class="i-tabler-check text-sm" />
        </button>
        <div
          v-if="filtered.length === 0"
          class="px-3 py-2 text-sm text-neutral-400"
        >
          No matching language
        </div>
      </div>
    </div>
  </div>
</template>
