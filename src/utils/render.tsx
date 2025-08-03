import type Renderer from 'markdown-it/lib/renderer.mjs'
import type Token from 'markdown-it/lib/token.mjs'
import type { VNode } from 'vue'
import { escapeHtml, unescapeAll } from 'markdown-it/lib/common/utils.mjs'
import { Comment, createVNode, Fragment, h, Text } from 'vue'

export interface Plugin<Ctx = any> {
  name: string
  register?: (ctx: Ctx) => any
}
export const DOM_ATTR_NAME = {
  SOURCE_LINE_START: 'data-source-line',
  SOURCE_LINE_END: 'data-source-line-end',
  ORIGIN_SRC: 'origin-src',
  ORIGIN_HREF: 'origin-href',
  LOCAL_IMAGE: 'local-image',
  ONLY_CHILD: 'auto-center',
  TOKEN_IDX: 'data-token-idx',
  DISPLAY_NONE: 'display-none',
}

const sensitiveUrlReg = /^javascript:|vbscript:|file:/i
const sensitiveAttrReg = /^href|src|xlink:href|poster/i
const attrNameReg = /^[a-z_:][\w:.-]*$/i
const attrEventReg = /^on/i
const defaultRules = {} as any

function validateAttrName(name: string) {
  return attrNameReg.test(name) && !attrEventReg.test(name)
}

function getLine(token: Token, env?: Record<string, any>) {
  const [lineStart, lineEnd] = token.map || [0, 1]

  // macro, calc line offset, see `markdown-macro` plugin.
  let sOffset = 0
  if (env?.macroLines && env.bMarks && env.eMarks) {
    const sPos = env.bMarks[lineStart]
    for (let i = 0; i < env.macroLines.length; i++) {
      const { matchPos, lineOffset, posOffset, currentPosOffset } = env.macroLines[i]
      if (sPos + posOffset > matchPos && sPos + posOffset - currentPosOffset > matchPos) {
        sOffset = lineOffset
      }
      else {
        break
      }
    }
  }
  return [lineStart + sOffset, lineEnd + sOffset]
}

function processToken(token: Token, env?: Record<string, any>) {
  if (!token.meta) {
    token.meta = {}
  }

  if (env?.safeMode && token.attrs) {
    for (let [name, val] of token.attrs) {
      name = name.toLowerCase()
      if (sensitiveAttrReg.test(name) && sensitiveUrlReg.test(val)) {
        token.attrSet(name, '')
      }

      if (name === 'href' && val.toLowerCase().startsWith('data:')) {
        token.attrSet(name, '')
      }
    }
  }

  if (token.block) {
    const [lineStart, lineEnd] = getLine(token, env)
    if (token.map) {
      token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_START, String(lineStart + 1))
      token.attrSet(DOM_ATTR_NAME.SOURCE_LINE_END, String(lineEnd + 1))
      if (!token.meta.attrs) {
        token.meta.attrs = {}
      }

      // transform array to object
      if (token.attrs) {
        for (const [name, val] of token.attrs) {
          token.meta.attrs[name] = val
        }
      }
    }
  }
}

defaultRules.code_inline = function (tokens: Token[], idx: number, _: any, __: any, slf: Renderer) {
  const token = tokens[idx]
  return createVNode('code', { ...slf.renderAttrs(token) as any, key: idx } as any, token.content)
}

defaultRules.code_block = function (tokens: Token[], idx: number, _: any, __: any, slf: Renderer) {
  const token = tokens[idx]
  const attrs: any = slf.renderAttrs(token)
  const preAttrs = {
    [DOM_ATTR_NAME.SOURCE_LINE_START]: attrs[DOM_ATTR_NAME.SOURCE_LINE_START],
    [DOM_ATTR_NAME.SOURCE_LINE_END]: attrs[DOM_ATTR_NAME.SOURCE_LINE_END],
  }

  delete attrs[DOM_ATTR_NAME.SOURCE_LINE_START]
  delete attrs[DOM_ATTR_NAME.SOURCE_LINE_END]
  return h(
    'pre',
    preAttrs,
    [h('code', attrs, [createVNode(Text, {}, token.content)])],
  )
}

const CodeBlockWrapper = defineComponent({
  name: 'CodeBlockWrapper',
  props: {
    language: {
      type: String,
      default: '',
    },
    content: {
      type: String,
      required: true,
    },
    preAttrs: {
      type: Object,
      default: () => ({}),
    },
  },
  setup(props) {
    const copied = ref(false)

    const copyCode = () => {
      // 创建一个临时的元素来提取文本内容
      const tempElement = document.createElement('div')
      tempElement.innerHTML = props.content // 设置 HTML 内容
      const { textContent } = tempElement
      navigator.clipboard.writeText(textContent ?? '').then(() => {
        copied.value = true
        setTimeout(() => {
          copied.value = false
        }, 2000)
      })
    }

    return { copyCode, copied }
  },
  render() {
    return h('div', {
      class: 'code-block-wrapper border rounded-xl my-4 overflow-hidden max-w-[calc(100vw-24px)]',
    }, [
      h('div', {
        class: 'code-block-toolbar bg-neutral-100 border-b px-4 text-neutral-4 py-2 flex justify-between items-center dark:bg-neutral-800 dark:border-neutral-700',
      }, [
        h('span', { class: 'code-language text-sm uppercase font-mono' }, this.language || 'text'),
        h('button', {
          class: 'copy-button text-sm w-6 h-6 rounded hover:bg-neutral-7 leading-0',
          onClick: this.copyCode,
        }, this.copied ? h('i', { class: 'i-tabler-check' }) : h('i', { class: 'i-tabler-copy' })),
      ]),
      h('div', { class: 'code-content' }, [
        h('pre', this.preAttrs, [createVNode('code', { innerHTML: this.content }, [])]),
      ]),
    ])
  },
})

// Modified fence rule
defaultRules.fence = function (tokens: Token[], idx: number, options: any, _: any, slf: Renderer) {
  const token = tokens[idx]
  const info = token.info ? unescapeAll(token.info).trim() : ''
  let langName = ''
  let langAttrs = ''
  let i
  let arr
  let tmpAttrs
  let tmpToken

  if (info) {
    arr = info.split(/(\s+)/g)
    langName = arr[0]
    langAttrs = arr.slice(2).join('')
  }
  const highlighted = options.highlight ? options.highlight(token.content, langName, langAttrs) || escapeHtml(token.content) : escapeHtml(token.content)

  const buildVNode = (attrs: any) => {
    const preAttrs = {
      'data-info': info,
      'data-lang': langName,
      [DOM_ATTR_NAME.SOURCE_LINE_START]: attrs[DOM_ATTR_NAME.SOURCE_LINE_START],
      [DOM_ATTR_NAME.SOURCE_LINE_END]: attrs[DOM_ATTR_NAME.SOURCE_LINE_END],
    }

    delete attrs[DOM_ATTR_NAME.SOURCE_LINE_START]
    delete attrs[DOM_ATTR_NAME.SOURCE_LINE_END]

    // Use our wrapper component instead of directly returning pre/code
    return h(
      CodeBlockWrapper,
      {
        language: langName,
        content: highlighted,
        preAttrs,
      },
    )
  }

  // If language exists, inject class gently, without modifying original token.
  if (info) {
    i = token.attrIndex('class')
    tmpAttrs = token.attrs ? [...token.attrs] : []

    if (i < 0) {
      tmpAttrs.push(['class', options.langPrefix + langName])
    }
    else {
      tmpAttrs[i] = [...tmpAttrs[i]] as any
      tmpAttrs[i][1] += ` ${options.langPrefix}${langName}`
    }

    // Fake token just to render attributes
    tmpToken = {
      attrs: tmpAttrs,
    }

    return buildVNode(slf.renderAttrs(tmpToken as any))
  }

  return buildVNode(slf.renderAttrs(token))
}

defaultRules.image = function (tokens: Token[], idx: number, options: any, env: any, slf: Renderer) {
  const token = tokens[idx]

  return h('img', {
    ...slf.renderAttrs(token) as any,
    alt: slf.renderInlineAsText(token.children || [], options, env),
  }, [])
}

defaultRules.hardbreak = function (_: Token[], idx: number) {
  return h('br', { key: idx })
}
defaultRules.softbreak = function (_: Token[], idx: number, options: any) {
  return options.breaks ? h('br', { key: idx }) : null
}

defaultRules.list_item_open = function (tokens: Token[], idx: number, _: any, __: any, self: Renderer) {
  return h('li', { key: idx, ...self.renderAttrs(tokens[idx]) as any }, [])
}

defaultRules.paragraph_open = function (tokens: Token[], idx: number, _: any, __: any, self: Renderer) {
  // 强制添加 p 标签，即使单个列表项。从而防止列表项元素突变。
  return h('p', { key: idx, ...self.renderAttrs(tokens[idx]) as any }, [])
}

defaultRules.text = function (tokens: Token[], idx: number, _: any, env: any) {
  const token = tokens[idx]
  if (env.sanitize) {
    // 检查 content 是否包含是句尾符号，如 '，', '。', '？', '！', '. '
    // 使用
    // 分割英语 (?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=\.|\?)
    // 分割中文 (?<=[。？！；])
    const splited = token.content.split(/(?<=[。？！；、，\n])|(?<!\w\.\w.)(?<![A-Z][a-z]\.)(?<=[.?!`])/g)
    return splited.map((content, i) => {
      return createVNode('span', { key: i }, { default: () => content })
    })
  }
  else {
    // console.log('text', token)
    return createVNode(Text, { key: idx }, token.content)
    // return createVNode(Text, { key: idx }, token.content)
  }
}

defaultRules.html_block = function (tokens: Token[], idx: number) {
  const token = tokens[idx] as any
  if (token.contentVNode) {
    return token.contentVNode
  }

  return createHtmlVNode(token.content)
}

defaultRules.html_inline = function (tokens: Token[], idx: number) {
  const token = tokens[idx] as any
  if (token.contentVNode) {
    return token.contentVNode
  }

  return createHtmlVNode(token.content)
}

function createHtmlVNode(html: string) {
  const div = document.createElement('template')
  div.innerHTML = html
  const elements = div.content.children
  const children = []
  for (const element of elements) {
    const tagName = element.tagName.toLowerCase()
    const attrs: Record<string, any> = {
      key: element.outerHTML,
    }

    for (let j = 0; j < element.attributes.length; j++) {
      const attr = element.attributes[j]
      attrs[attr.name] = attr.value
    }

    attrs.innerHTML = element.innerHTML
    attrs.key = element.innerHTML
    children.push(h(tagName, attrs, []))
  }
  return h(Fragment, {}, children)
}

function renderToken(this: Renderer, tokens: Token[], idx: number): any {
  const token = tokens[idx]

  if (token.nesting === -1) {
    return null
  }

  // Tight list paragraphs
  if (token.hidden) {
    return createVNode(Fragment, {}, [])
  }

  if (token.tag === '--') {
    return createVNode(Comment)
  }
  return createVNode(token.tag, this.renderAttrs(token) as any, [])
}

function renderAttrs(this: Renderer, token: Token) {
  if (!token.attrs) {
    return {}
  }

  const result: any = {}

  // eslint-disable-next-line unicorn/no-array-for-each
  token.attrs.forEach((token) => {
    if (validateAttrName(token[0])) {
      result[token[0]] = token[1]
    }
  })
  return result
}

function render(this: Renderer, tokens: Token[], options: any, env: any) {
  const rules: any = this.rules

  const vNodeParents: VNode[] = []

  return tokens.map((token, i) => {
    processToken(token, env)
    if (token.block) {
      token.attrSet(DOM_ATTR_NAME.TOKEN_IDX, i.toString())
    }

    const { type } = token

    let vnode: VNode | null = null
    let parent: VNode | null = null

    if (type === 'inline') {
      vnode = this.render(token.children || [], options, env) as any
    }
    else if (rules[type]) {
      const result = rules[type](tokens, i, options, env, this)
      if (typeof result === 'string') {
        vnode = createHtmlVNode(result)
      }
      else if (result && result.node && result.parent) {
        parent = result.parent
        vnode = result.node
      }
      else {
        vnode = result
      }
    }
    else {
      vnode = this.renderToken(tokens, i, options) as any
    }

    let isChild = false
    const parentNode = vNodeParents.length > 0 ? vNodeParents.at(-1) : null
    if (vnode && parentNode) {
      if (typeof parentNode.type === 'string' || parentNode.type === Fragment) {
        const children = Array.isArray(parentNode.children) ? parentNode.children : []
        parentNode.children = [...children, vnode]
      }
      isChild = true
    }

    if (token.nesting === 1) {
      if (parent) {
        vNodeParents.push(parent)
      }
      else if (vnode) {
        vNodeParents.push(vnode)
      }
    }

    if (token.nesting === -1) {
      vNodeParents.pop()
    }
    return isChild ? null : vnode
  }).filter(node => !!node) as any
}

function render_(md: any) {
  md.renderer.rules = { ...md.renderer.rules, ...defaultRules }
  md.renderer.render = render
  md.renderer.renderInline = render
  md.renderer.renderAttrs = renderAttrs
  md.renderer.renderToken = renderToken
}
export default render_
