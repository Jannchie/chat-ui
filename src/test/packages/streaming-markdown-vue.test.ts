import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import { addFadeInToVNodes } from '../../packages/streaming-markdown-vue'

describe('streaming-markdown-vue', () => {
  it('adds fade-in classes to Vue VNodes through the adapter', () => {
    const nodes = [
      h('div', [
        h('span', { class: 'first' }, 'Hello'),
        h('span', 'World'),
      ]),
    ]

    const result = addFadeInToVNodes(nodes, true)
    const children = result[0].children as any[]

    expect(children[0].props.class).toBe('first fade-in')
    expect(children[1].props.class).toBe('fade-in')
  })
})
