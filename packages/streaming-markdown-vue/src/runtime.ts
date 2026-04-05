import markdownit from 'markdown-it'
import todo from 'markdown-it-todo'
import { ref } from 'vue'
import VNodePlugin from './render'

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
    // If Shiki fails to load, ensure repeated attempts are skipped.
    isShikiLoaded.value = true
  }
}
