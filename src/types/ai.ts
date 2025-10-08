import type { streamText } from 'ai'

export type ReasoningEffort = 'minimal' | 'low' | 'medium' | 'high'

type StreamTextOptions = Parameters<typeof streamText>[0]

export type ProviderOptions = NonNullable<StreamTextOptions['providerOptions']>
