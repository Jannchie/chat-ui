import { describe, expect, it } from 'vitest'
import {
  buildReasoningProviderOptions,
  resolveReasoningCapability,
  resolveReasoningEffortPreference,
} from '../lib/reasoning'

describe('reasoning capability', () => {
  it('maps the base gpt-5 family to minimal through high', () => {
    const capability = resolveReasoningCapability({
      platform: 'openai',
      modelId: 'gpt-5',
    })

    expect(capability.supportsReasoning).toBe(true)
    expect(capability.selectorKind).toBe('effort')
    expect(capability.allowedEfforts).toEqual([
      'minimal',
      'low',
      'medium',
      'high',
    ])
  })

  it('maps gpt-5.4 to none through xhigh without minimal', () => {
    const capability = resolveReasoningCapability({
      platform: 'openai',
      modelId: 'gpt-5.4',
    })

    expect(capability.supportsReasoning).toBe(true)
    expect(capability.selectorKind).toBe('effort')
    expect(capability.allowedEfforts).toEqual([
      'none',
      'low',
      'medium',
      'high',
      'xhigh',
    ])
  })

  it('maps gpt-5-pro to a fixed high effort', () => {
    const capability = resolveReasoningCapability({
      platform: 'openai',
      modelId: 'gpt-5-pro',
    })

    expect(capability.supportsReasoning).toBe(true)
    expect(capability.selectorKind).toBe('effort')
    expect(capability.allowedEfforts).toEqual(['high'])
    expect(capability.defaultEffort).toBe('high')
  })

  it('hides reasoning for non reasoning openai models', () => {
    const capability = resolveReasoningCapability({
      platform: 'openai',
      modelId: 'gpt-4.1',
    })

    expect(capability.supportsReasoning).toBe(false)
    expect(capability.selectorKind).toBe('none')
    expect(capability.allowedEfforts).toEqual([])
  })

  it('treats anthropic thinking models as budget based reasoning', () => {
    const capability = resolveReasoningCapability({
      platform: 'anthropic',
      modelId: 'claude-3-7-sonnet-20250219',
    })

    expect(capability.supportsReasoning).toBe(true)
    expect(capability.selectorKind).toBe('budget')
    expect(capability.defaultEffort).toBe('medium')
  })

  it('shows openrouter effort selector only when model metadata supports reasoning', () => {
    const capability = resolveReasoningCapability({
      platform: 'openrouter',
      modelId: 'openai/gpt-5',
      openRouterSupportedParameters: [
        'max_tokens',
        'reasoning',
        'include_reasoning',
      ],
    })

    expect(capability.supportsReasoning).toBe(true)
    expect(capability.selectorKind).toBe('effort')
    expect(capability.allowedEfforts).toEqual([
      'none',
      'minimal',
      'low',
      'medium',
      'high',
      'xhigh',
    ])
  })

  it('falls back to the capability default when preference is invalid', () => {
    const capability = resolveReasoningCapability({
      platform: 'openai',
      modelId: 'o3',
    })

    expect(resolveReasoningEffortPreference(capability, 'xhigh')).toBe(
      'medium',
    )
  })
})

describe('reasoning provider options', () => {
  it('builds openai reasoning options', () => {
    const capability = resolveReasoningCapability({
      platform: 'openai',
      modelId: 'gpt-5.4',
    })

    expect(
      buildReasoningProviderOptions({
        platform: 'openai',
        effort: 'xhigh',
        capability,
      }),
    ).toEqual({
      openai: {
        reasoningEffort: 'xhigh',
      },
    })
  })

  it('builds anthropic thinking options from the normalized effort preference', () => {
    const capability = resolveReasoningCapability({
      platform: 'anthropic',
      modelId: 'claude-sonnet-4-20250514',
    })

    expect(
      buildReasoningProviderOptions({
        platform: 'anthropic',
        effort: 'low',
        capability,
      }),
    ).toEqual({
      anthropic: {
        thinking: {
          type: 'enabled',
          budgetTokens: 2048,
        },
      },
    })
  })

  it('builds openrouter reasoning options using the provider namespace', () => {
    const capability = resolveReasoningCapability({
      platform: 'openrouter',
      modelId: 'openai/gpt-5',
      openRouterSupportedParameters: ['reasoning'],
    })

    expect(
      buildReasoningProviderOptions({
        platform: 'openrouter',
        effort: 'xhigh',
        capability,
      }),
    ).toEqual({
      openrouter: {
        reasoning: {
          effort: 'xhigh',
        },
      },
    })
  })

  it('does not enable anthropic thinking when the normalized effort is none', () => {
    const capability = resolveReasoningCapability({
      platform: 'anthropic',
      modelId: 'claude-3-7-sonnet-20250219',
    })

    expect(
      buildReasoningProviderOptions({
        platform: 'anthropic',
        effort: 'none',
        capability,
      }),
    ).toBeUndefined()
  })
})
