import { fileURLToPath } from 'node:url'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import UnoCSS from 'unocss/vite'
import AutoImport from 'unplugin-auto-import/vite'
import Components from 'unplugin-vue-components/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const componentsDtsPath = fileURLToPath(new URL('src/components.d.ts', import.meta.url))
const autoImportDtsPath = fileURLToPath(new URL('src/auto-import.d.ts', import.meta.url))

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
