import { describe, expect, it } from 'vitest'
import {
  addFadeInClassToTreeNodes,
  splitContent,
} from '../../packages/streaming-markdown-core'

describe('streaming-markdown-core', () => {
  it('drops incomplete trailing sentence while streaming', () => {
    expect(splitContent('Hello world. Still typing')).toBe('Hello world.')
    expect(splitContent('你好。还有')).toBe('你好。')
  })

  it('drops dangling ordered list prefixes', () => {
    expect(splitContent('1. First item\n2.')).toBe('1. First item\n')
  })

  it('adds fade-in class recursively to string-backed nodes', () => {
    const tree = [
      {
        props: { class: 'root' },
        children: [
          { props: { class: 'leaf' }, children: 'Hello' },
          {
            children: [
              { props: {}, children: 'World' },
            ],
          },
        ],
      },
    ]

    const result = addFadeInClassToTreeNodes(tree, true)
    const nestedLeaf = result[0].children as any[]
    const deepestLeaf = nestedLeaf[1].children as any[]

    expect(nestedLeaf[0].props.class).toBe('leaf fade-in')
    expect(deepestLeaf[0].props.class).toBe('fade-in')
  })

  it('does not mutate classes when loading is false', () => {
    const tree = [{ props: { class: 'leaf' }, children: 'Hello' }]
    const result = addFadeInClassToTreeNodes(tree, false)
    expect(result[0].props?.class).toBe('leaf')
  })
})
