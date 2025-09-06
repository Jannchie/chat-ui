import markdownit from 'markdown-it'
import todo from 'markdown-it-todo'
import { chatHistoryIDB } from '../shared'
import { v7 as uuidv7 } from 'uuid'
import VNodePlugin from './render'

export * from './platform'

export const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})
export function generateId() {
  // Always use UUIDv7 from external library to avoid custom implementations
  return uuidv7()
}

export const md = markdownit({
  linkify: true,
  typographer: true,
  breaks: true,
  html: true,
} as any)
md.use(VNodePlugin)
md.use(todo)

// Lazy load katex and shiki to reduce initial bundle size
export const isKatexLoaded = ref(false)
export const isShikiLoaded = ref(false)

export async function loadKatex() {
  if (isKatexLoaded.value) {
    return
  }

  const [katex, texmath] = await Promise.all([
    import('katex'),
    import('markdown-it-texmath'),
    import('katex/dist/katex.min.css'), // Lazy load CSS
  ])

  const tm = texmath.default.use(katex.default)
  md.use(tm, { delimiters: ['brackets', 'dollars'] })
  isKatexLoaded.value = true
}

export async function loadShiki() {
  if (isShikiLoaded.value) {
    return
  }

  try {
    const Shiki = await import('@shikijs/markdown-it')

    const shiki = await Shiki.default({
      theme: 'vitesse-dark',
      // Only load most commonly used languages to reduce bundle size
      langs: [
        'javascript',
        'typescript',
        'python',
        'bash',
        'json',
        'html',
        'css',
        'markdown',
        'vue',
        'rust',
        'go',
        'java',
        'sql',
        'jsx',
        'tsx',
      ],
      fallbackLanguage: 'markdown',
    })
    md.use(shiki)
    isShikiLoaded.value = true
  }
  catch (error) {
    console.error('Failed to load Shiki:', error)
    // 如果 Shiki 加载失败，至少确保不会重复尝试
    isShikiLoaded.value = true
  }
}

export function getChat(id: string) {
  return chatHistoryIDB.data.value.find(chat => chat.id === id) ?? null
}

export function setChat(chat: ChatData) {
  const index = chatHistoryIDB.data.value.findIndex(c => c.id === chat.id)
  if (index === -1) {
    chatHistoryIDB.data.value.unshift(toRaw(chat))
  }
  else {
    chatHistoryIDB.data.value[index] = toRaw(chat)
  }
  chatHistoryIDB.data.value = [...chatHistoryIDB.data.value]
}

export function deleteChat(id: string) {
  const index = chatHistoryIDB.data.value.findIndex(c => c.id === id)
  if (index !== -1) {
    chatHistoryIDB.data.value.splice(index, 1)
    chatHistoryIDB.data.value = [...chatHistoryIDB.data.value]
  }
}
