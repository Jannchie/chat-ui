import * as fs from 'node:fs'
import { rokuPreset } from '@roku-ui/preset'
import presetWebFonts from '@unocss/preset-web-fonts'
import { defineConfig, presetTypography } from 'unocss'

const file = fs.readFileSync('node_modules/@roku-ui/vue/dist/index.js', 'utf8')

export default defineConfig({
  content: {
    inline: [file],
  },
  theme: {
    colors: {
      // 暗色模式浮层表面色（输入框、气泡、菜单等）及其 hover 档
      'elevated': '#1e1e1f',
      'elevated-hover': '#252526',
    },
  },
  shortcuts: {
    // 聊天主轴列宽：对话列 / 输入框 / 空状态页共用
    'max-w-chat': 'max-w-712px',
    'chat-prose':
      'text-sm md:text-base max-w-none prose prose-neutral prose-code:text-sm prose-h1:text-3xl prose-h2:text-xl prose-h3:text-lg prose-h4:text-base prose-h5:text-base children:mt-0 dark:prose-invert prose-code:after:content-none prose-code:before:content-none',
  },
  presets: [
    rokuPreset(),
    presetTypography({
      cssExtend: {
        code: {
          fontFamily: 'monospace',
        },
      },
    }),
    presetWebFonts({
      provider: 'google',
      fonts: {
        condensed: 'Roboto Condensed',
      },
    }),
  ],
})
