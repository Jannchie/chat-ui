import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import UnoCSS from 'unocss/vite';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        vue(),
        vueJsx(),
        UnoCSS(),
        Components({
            dirs: ['./src/components', './src/views'],
            dts: './src/components.d.ts',
        }),
        AutoImport({
            imports: [
                'vue',
                '@vueuse/core',
                'vue-router',
            ],
            dirs: [
                './src/composables',
                './src/locale',
            ],
            dts: './src/auto-import.d.ts',
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
                description: 'A chat application built with modern styles and technologies.',
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
                manualChunks: {
                    'vendor-vue': ['vue', 'vue-router'],
                    'vendor-ui': ['@vueuse/core', '@vueuse/integrations'],
                    'vendor-db': ['dexie', 'idb-keyval'],
                },
            },
        },
        chunkSizeWarningLimit: 1000,
    },
    optimizeDeps: {
        include: [
            'vue',
            'vue-router',
            '@vueuse/core',
        ],
        exclude: ['shiki'],
    },
});
