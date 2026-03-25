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
const OPENAI_GPT_5_REASONING_EFFORTS: ReasoningEffort[] = ['minimal', 'low', 'medium', 'high']
const OPENAI_GPT_5_1_REASONING_EFFORTS: ReasoningEffort[] = ['none', 'low', 'medium', 'high']
const OPENAI_GPT_5_2_PLUS_REASONING_EFFORTS: ReasoningEffort[] = ['none', 'low', 'medium', 'high', 'xhigh']
const OPENAI_GPT_5_PRO_REASONING_EFFORTS: ReasoningEffort[] = ['high']
const OPENAI_GPT_5_2_PLUS_PRO_REASONING_EFFORTS: ReasoningEffort[] = ['medium', 'high', 'xhigh']
const OPENAI_GPT_5_MODEL_REGEXP = /^gpt-5(?:-\d{4}-\d{2}-\d{2})?$/
const OPENAI_GPT_5_1_MODEL_REGEXP = /^gpt-5\.1(?:-\d{4}-\d{2}-\d{2})?$/
const OPENAI_GPT_5_2_MODEL_REGEXP = /^gpt-5\.2(?:-\d{4}-\d{2}-\d{2})?$/
const OPENAI_GPT_5_4_MODEL_REGEXP = /^gpt-5\.4(?:-\d{4}-\d{2}-\d{2})?$/
const OPENAI_GPT_5_PRO_MODEL_REGEXP = /^gpt-5-pro(?:-\d{4}-\d{2}-\d{2})?$/
const OPENAI_GPT_5_2_PRO_MODEL_REGEXP = /^gpt-5\.2-pro(?:-\d{4}-\d{2}-\d{2})?$/
const OPENAI_GPT_5_4_PRO_MODEL_REGEXP = /^gpt-5\.4-pro(?:-\d{4}-\d{2}-\d{2})?$/
const OPENAI_GPT_5_2_CODEX_MODEL_REGEXP = /^gpt-5\.2-codex(?:-\d{4}-\d{2}-\d{2})?$/
const OPENAI_GPT_5_3_CODEX_MODEL_REGEXP = /^gpt-5\.3-codex(?:-\d{4}-\d{2}-\d{2})?$/
const OPENROUTER_REASONING_EFFORTS: ReasoningEffort[] = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh']

const OPENAI_REASONING_RULES = [
  {
    pattern: OPENAI_GPT_5_MODEL_REGEXP,
    efforts: OPENAI_GPT_5_REASONING_EFFORTS,
  },
  {
    pattern: OPENAI_GPT_5_1_MODEL_REGEXP,
    efforts: OPENAI_GPT_5_1_REASONING_EFFORTS,
  },
  {
    pattern: OPENAI_GPT_5_2_MODEL_REGEXP,
    efforts: OPENAI_GPT_5_2_PLUS_REASONING_EFFORTS,
  },
  {
    pattern: OPENAI_GPT_5_4_MODEL_REGEXP,
    efforts: OPENAI_GPT_5_2_PLUS_REASONING_EFFORTS,
  },
  {
    pattern: OPENAI_GPT_5_PRO_MODEL_REGEXP,
    efforts: OPENAI_GPT_5_PRO_REASONING_EFFORTS,
  },
  {
    pattern: OPENAI_GPT_5_2_PRO_MODEL_REGEXP,
    efforts: OPENAI_GPT_5_2_PLUS_PRO_REASONING_EFFORTS,
  },
  {
    pattern: OPENAI_GPT_5_4_PRO_MODEL_REGEXP,
    efforts: OPENAI_GPT_5_2_PLUS_PRO_REASONING_EFFORTS,
  },
  {
    pattern: OPENAI_GPT_5_2_CODEX_MODEL_REGEXP,
    efforts: ['low', 'medium', 'high', 'xhigh'] satisfies ReasoningEffort[],
  },
  {
    pattern: OPENAI_GPT_5_3_CODEX_MODEL_REGEXP,
    efforts: ['low', 'medium', 'high', 'xhigh'] satisfies ReasoningEffort[],
  },
] as const

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

function getOpenAIReasoningEfforts(modelId?: string | null): ReasoningEffort[] {
  const normalized = stripProviderPrefix(modelId)
  if (!normalized) {
    return []
  }

  for (const rule of OPENAI_REASONING_RULES) {
    if (rule.pattern.test(normalized)) {
      return [...rule.efforts]
    }
  }

  return []
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
      const allowedEfforts = getOpenAIReasoningEfforts(modelId)
      if (allowedEfforts.length === 0) {
        return DEFAULT_REASONING_CAPABILITY
      }
      return {
        supportsReasoning: true,
        selectorKind: 'effort',
        allowedEfforts,
        defaultEffort:
          allowedEfforts.includes('medium')
            ? 'medium'
            : allowedEfforts[0]!,
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
          reasoningEffort: selectedEffort,
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
