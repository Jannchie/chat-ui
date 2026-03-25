declare namespace MdTodoParser {
  interface Token {
    type: string
    content: string
    level: number
    children: Token[]
    attrs: [string, string][]

    attrIndex: (name: string) => number
    attrPush: (attr: [string, string]) => void
  }

  interface State {
    tokens: Token[]
    Token: TokenConstructor
  }

  interface TokenConstructor {
    new (type: string, tag: string, nesting: number): Token
  }

  function isInline(token: Token): boolean

  function isParagraph(token: Token): boolean

  function isListItem(token: Token): boolean

  function startsWithTodoMarkdown(token: Token): boolean

  function isTodoItem(tokens: Token[], index: number): boolean

  function setAttr(token: Token, name: string, value: string): void

  function parentToken(tokens: Token[], index: number): number

  function todoify(token: Token, TokenConstructor: TokenConstructor): void

  function createTodoItem(
    token: Token,
    TokenConstructor: TokenConstructor,
  ): Token
}

declare module 'markdown-it-todo' {
  const todoParser: (md: any) => void
  export = todoParser
}
