import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { SHIKI_LANGS } from './src/shared/shiki-langs'

const componentsDtsPath = fileURLToPath(new URL('src/components.d.ts', import.meta.url))
const autoImportDtsPath = fileURLToPath(new URL('src/auto-import.d.ts', import.meta.url))

// shiki 全量 bundle 会为全部 300+ 语言和 60+ 主题各生成一个懒加载 chunk（约 10MB），
// 但运行时只请求 SHIKI_LANGS 及其语法依赖，主题走自定义对象、一个都不会加载。
// 这里把用不到的 chunk 从 Service Worker 预缓存里排除，避免每个用户后台白下载。
function shikiPrecacheIgnores(): string[] {
  const require = createRequire(import.meta.url)
  const shikiLangsDir = path.dirname(require.resolve('shiki/dist/langs/javascript.mjs'))
  const grammarDir = path.dirname(
    createRequire(shikiLangsDir).resolve('@shikijs/langs/javascript'),
  )

  // 语法之间有依赖（如 vue → html/css，bash → shellscript），沿 import 求闭包
  const usedLangs = new Set<string>()
  const queue: string[] = [...SHIKI_LANGS]
  while (queue.length > 0) {
    const name = queue.pop()!
    if (usedLangs.has(name)) {
      continue
    }
    usedLangs.add(name)
    const source = readFileSync(path.join(grammarDir, `${name}.mjs`), 'utf8')
    for (const match of source.matchAll(/from\s+['"]\.\/(.+?)\.mjs['"]/g)) {
      queue.push(match[1])
    }
  }

  const ignores: string[] = []
  for (const file of readdirSync(shikiLangsDir)) {
    if (!file.endsWith('.mjs')) {
      continue
    }
    const name = file.slice(0, -'.mjs'.length)
    if (!usedLangs.has(name)) {
      ignores.push(`assets/${name}-*.js`)
    }
  }
  const shikiThemesDir = path.join(path.dirname(shikiLangsDir), 'themes')
  for (const file of readdirSync(shikiThemesDir)) {
    if (file.endsWith('.mjs')) {
      ignores.push(`assets/${file.slice(0, -'.mjs'.length)}-*.js`)
    }
  }
  return ignores
}

function manualChunks(id: string) {
  if (id.includes('node_modules/vue/') || id.includes('node_modules/vue-router/')) {
    return 'vendor-vue'
  }
  if (id.includes('node_modules/@vueuse/core/') || id.includes('node_modules/@vueuse/integrations/')) {
    return 'vendor-ui'
  }
  if (id.includes('node_modules/dexie/') || id.includes('node_modules/idb-keyval/')) {
    return 'vendor-db'
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueJsx(),
    UnoCSS(),
    Components({
      dirs: ['./src/components', './src/views'],
      dts: componentsDtsPath,
    }),
    AutoImport({
      imports: ['vue', '@vueuse/core', 'vue-router'],
      dirs: ['./src/composables', './src/locale'],
      dts: autoImportDtsPath,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        globIgnores: shikiPrecacheIgnores(),
      },
      manifest: {
        name: 'Jannchie\'s Chat UI',
        short_name: 'Chat UI',
        description:
          'A chat application built with modern styles and technologies.',
        theme_color: '#131314',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2022',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks,
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    include: ['vue', 'vue-router', '@vueuse/core', 'shiki'],
  },
})
