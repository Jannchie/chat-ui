import * as fs from 'node:fs'
import { rokuPreset } from '@roku-ui/preset'
import presetWebFonts from '@unocss/preset-web-fonts'
import { defineConfig, presetTypography } from 'unocss'

const file = fs.readFileSync('node_modules/@roku-ui/vue/dist/index.js', 'utf8')

export default defineConfig({
  content: {
    inline: [file],
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
    // presetWebFonts({
    //   provider: 'google',
    //   fonts: {
    //     condensed: 'Roboto Condensed',
    //   },
    // }),
  ],
})
