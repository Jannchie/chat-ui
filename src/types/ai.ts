import type { streamText } from 'ai'

export type ReasoningEffort = 'minimal' | 'low' | 'normal' | 'high'

type StreamTextOptions = Parameters<typeof streamText>[0]

export type ProviderOptions = NonNullable<StreamTextOptions['providerOptions']>
