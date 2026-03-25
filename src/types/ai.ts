import type { streamText } from 'ai'

export type ReasoningEffort
  = | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'

type StreamTextOptions = Parameters<typeof streamText>[0]

export type ProviderOptions = NonNullable<StreamTextOptions['providerOptions']>
