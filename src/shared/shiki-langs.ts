import type { BundledLanguage } from 'shiki'

// 运行时实际会加载的 shiki 语言。
// vite.config.ts 也依赖这份列表：只有这些语言（及其语法依赖）的 chunk
// 会进入 Service Worker 预缓存，其余 300+ 语言/主题 chunk 被排除。
export const SHIKI_LANGS: BundledLanguage[] = [
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
]
