import fs from 'node:fs'
import { rokuPreset } from '@roku-ui/preset'
import { defineConfig, presetTypography } from 'unocss'

const file = fs.readFileSync('node_modules/@roku-ui/vue/dist/index.js', 'utf8')

export default defineConfig({
  content: {
    inline: [file],
  },
  presets: [
    rokuPreset(),
    presetTypography({}),
  ],
})
