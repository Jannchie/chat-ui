import type { ProviderOptions, ReasoningEffort } from '../types/ai'

export type ReasoningSelectorKind = 'none' | 'effort' | 'budget'

export interface ReasoningCapability {
  supportsReasoning: boolean
  selectorKind: ReasoningSelectorKind
  allowedEfforts: ReasoningEffort[]
  defaultEffort: ReasoningEffort
}

export interface ResolveReasoningCapabilityOptions {
  platform?: string | null
  modelId?: string | null
  openRouterSupportedParameters?: string[]
}

const ALL_REASONING_EFFORTS: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']
const OPENAI_REASONING_EFFORTS: ReasoningEffort[] = ['minimal', 'low', 'medium', 'high']
const OPENROUTER_REASONING_EFFORTS: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']

const DEFAULT_REASONING_CAPABILITY: ReasoningCapability = {
  supportsReasoning: false,
  selectorKind: 'none',
  allowedEfforts: [],
  defaultEffort: 'medium',
}

const ANTHROPIC_THINKING_MODELS = [
  /^claude-3-7-/,
  /^claude-(?:sonnet|opus)-4(?:$|-)/,
]

const ANTHROPIC_BUDGET_TOKENS_BY_EFFORT: Record<ReasoningEffort, number> = {
  none: 0,
  minimal: 1024,
  low: 2048,
  medium: 8192,
  high: 32_768,
  xhigh: 128_000,
}

function normalizeModelId(modelId?: string | null): string {
  return modelId?.trim().toLowerCase() ?? ''
}

function stripProviderPrefix(modelId?: string | null): string {
  const normalized = normalizeModelId(modelId)
  const slashIndex = normalized.indexOf('/')
  return slashIndex === -1 ? normalized : normalized.slice(slashIndex + 1)
}

function isOpenAIReasoningModel(modelId?: string | null): boolean {
  const normalized = stripProviderPrefix(modelId)
  if (!normalized || normalized.startsWith('gpt-5-chat')) {
    return false
  }
  return normalized.startsWith('o')
    || normalized.startsWith('gpt-5')
    || normalized.startsWith('codex-')
    || normalized.startsWith('computer-use')
}

function isAnthropicThinkingModel(modelId?: string | null): boolean {
  const normalized = stripProviderPrefix(modelId)
  return ANTHROPIC_THINKING_MODELS.some(pattern => pattern.test(normalized))
}

function supportsOpenRouterReasoning(openRouterSupportedParameters?: string[]): boolean {
  if (!openRouterSupportedParameters?.length) {
    return false
  }
  return openRouterSupportedParameters.includes('reasoning')
    || openRouterSupportedParameters.includes('reasoning_effort')
}

export function resolveReasoningCapability(options: ResolveReasoningCapabilityOptions): ReasoningCapability {
  const { platform, modelId, openRouterSupportedParameters } = options
  const normalizedPlatform = platform?.trim().toLowerCase() ?? ''

  switch (normalizedPlatform) {
    case 'openai': {
      if (!isOpenAIReasoningModel(modelId)) {
        return DEFAULT_REASONING_CAPABILITY
      }
      return {
        supportsReasoning: true,
        selectorKind: 'effort',
        allowedEfforts: OPENAI_REASONING_EFFORTS,
        defaultEffort: 'medium',
      }
    }

    case 'anthropic': {
      if (!isAnthropicThinkingModel(modelId)) {
        return DEFAULT_REASONING_CAPABILITY
      }
      return {
        supportsReasoning: true,
        selectorKind: 'budget',
        allowedEfforts: ALL_REASONING_EFFORTS,
        defaultEffort: 'medium',
      }
    }

    case 'openrouter': {
      if (!supportsOpenRouterReasoning(openRouterSupportedParameters)) {
        return DEFAULT_REASONING_CAPABILITY
      }
      return {
        supportsReasoning: true,
        selectorKind: 'effort',
        allowedEfforts: OPENROUTER_REASONING_EFFORTS,
        defaultEffort: 'medium',
      }
    }

    default: {
      return DEFAULT_REASONING_CAPABILITY
    }
  }
}

export function resolveReasoningEffortPreference(
  capability: ReasoningCapability,
  effort?: ReasoningEffort | null,
): ReasoningEffort {
  if (capability.allowedEfforts.includes(effort ?? capability.defaultEffort)) {
    return effort ?? capability.defaultEffort
  }
  return capability.defaultEffort
}

export function buildReasoningProviderOptions(options: {
  platform?: string | null
  effort?: ReasoningEffort | null
  capability: ReasoningCapability
}): ProviderOptions | undefined {
  const { platform, effort, capability } = options
  const selectedEffort = resolveReasoningEffortPreference(capability, effort)

  if (!capability.supportsReasoning) {
    return undefined
  }

  switch (platform?.trim().toLowerCase()) {
    case 'openai': {
      if (capability.selectorKind !== 'effort') {
        return undefined
      }
      return {
        openai: {
          reasoningEffort: selectedEffort as Extract<ReasoningEffort, 'minimal' | 'low' | 'medium' | 'high'>,
        },
      } as ProviderOptions
    }

    case 'anthropic': {
      if (capability.selectorKind !== 'budget') {
        return undefined
      }
      const budgetTokens = ANTHROPIC_BUDGET_TOKENS_BY_EFFORT[selectedEffort]
      if (!budgetTokens) {
        return undefined
      }
      return {
        anthropic: {
          thinking: {
            type: 'enabled',
            budgetTokens,
          },
        },
      } as ProviderOptions
    }

    case 'openrouter': {
      if (capability.selectorKind !== 'effort') {
        return undefined
      }
      return {
        openrouter: {
          reasoning: {
            effort: selectedEffort,
          },
        },
      } as ProviderOptions
    }

    default: {
      return undefined
    }
  }
}
