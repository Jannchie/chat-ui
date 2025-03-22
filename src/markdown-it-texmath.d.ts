declare module 'markdown-it-texmath' {
  interface KatexOptions {
    displayMode?: boolean
    throwOnError?: boolean
    macros?: { [key: string]: string }
  }

  interface TexMathOptions {
    delimiters?: string | string[]
    outerSpace?: boolean
    katexOptions?: KatexOptions
    engine?: any
    macros?: { [key: string]: string }
  }

  interface Rule {
    name: string
    rex: RegExp
    tmpl: string
    tag: string
    displayMode?: boolean
    pre?: (str: string, outerSpace: boolean, pos: number) => boolean
    post?: (str: string, outerSpace: boolean, pos: number) => boolean
    outerSpace?: boolean
  }

  interface Delimiters {
    inline: Rule[]
    block: Rule[]
  }

  interface TexMath {
    (md: any, options?: TexMathOptions): void
    mergeDelimiters: (delims?: string | string[]) => Delimiters
    inlineRuleNames: string[]
    blockRuleNames: string[]
    render: (tex: string, displayMode: boolean, options?: KatexOptions) => string
    use: (katex: any) => TexMath
    rules: { [key: string]: Delimiters }
    $_pre: (str: string, outerSpace: boolean, beg: number) => boolean
    $_post: (str: string, outerSpace: boolean, end: number) => boolean
    inline: (rule: Rule) => (state: any, silent: boolean) => boolean
    block: (rule: Rule) => (state: any, begLine: number, endLine: number, silent: boolean) => boolean
  }

  const texmath: TexMath
  export = texmath
}
