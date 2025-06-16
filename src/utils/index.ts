import Shiki from '@shikijs/markdown-it'
import katex from 'katex'
import markdownit from 'markdown-it'
import texmath from 'markdown-it-texmath'
import todo from 'markdown-it-todo'
import { chatHistoryIDB } from '../shared'
import VNodePlugin from './render'

export * from './platform'

export const isMobile = computed(() => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
})
export function generateId() {
  return globalThis.crypto.randomUUID()
}

export const md = markdownit({
  linkify: true,
  typographer: true,
  breaks: true,
  html: true,
} as any)
md.use(VNodePlugin)
const tm = texmath.use(katex)
md.use(tm, { delimiters: ['brackets', 'dollars'] })
md.use(todo)
export async function loadShiki() {
  const shiki = await Shiki({
    themes: {
      light: 'vitesse-light',
      dark: 'vitesse-dark',
    },
    langs: [
      'python',
      'javascript',
      'typescript',
      'bash',
      'json',
      'yaml',
      'html',
      'css',
      'markdown',
      'rust',
      'vue',
      'c',
      'c#',
      'c++',
      'java',
      'go',
      'php',
      'ruby',
      'swift',
      'kotlin',
      'scala',
      'sql',
      'perl',
      'lua',
      'r',
      'dart',
      'haskell',
      'clojure',
      'elixir',
      'f#',
      'groovy',
      'powershell',
      'racket',
      'scheme',
      'shell',
      'ocaml',
      'asm',
      'matlab',
      'hcl',
      'objective-c',
      'sas',
      'pascal',
      'vb',
      'cobol',
      'erlang',
      'wiki',
    ],
    defaultColor: 'dark',
    fallbackLanguage: 'wiki',
  })
  md.use(shiki)
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
