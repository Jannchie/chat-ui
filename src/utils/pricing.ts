import modelPricing from '../assets/model-pricing.json'

export interface ModelPricing {
  input_cost_per_token?: number
  output_cost_per_token?: number
  input_cost_per_token_batches?: number
  output_cost_per_token_batches?: number
  litellm_provider?: string
  mode?: string
  max_tokens?: number | string
  max_input_tokens?: number | string
  max_output_tokens?: number | string
}

export interface TokenUsage {
  input_tokens?: number
  output_tokens?: number
  total_tokens?: number
}

export interface CostCalculation {
  inputCost: number
  outputCost: number
  totalCost: number
  currency: string
}

/**
 * Calculate the cost of token usage for a specific model
 */
export function calculateTokenCost(
  modelName: string,
  usage: TokenUsage,
): CostCalculation | null {
  if (!usage) {
    return null
  }

  // Find pricing data for the model
  let pricing = (modelPricing as any)[modelName] as ModelPricing | undefined

  if (!pricing) {
    // Try with openrouter/ prefix (OpenRouter API returns "provider/model" but pricing uses "openrouter/provider/model")
    const openrouterModelName = `openrouter/${modelName}`
    pricing = (modelPricing as any)[openrouterModelName] as ModelPricing | undefined
    
    if (!pricing) {
      // Try extracting model name from provider/model format
      const extractedModelName = extractModelName(modelName)
      pricing = (modelPricing as any)[extractedModelName] as ModelPricing | undefined
      
      if (!pricing) {
        // Try to find similar model names (handle variations)
        const normalizedModelName = normalizeModelName(extractedModelName)
        const matchedKey = Object.keys(modelPricing).find(key =>
          normalizeModelName(key) === normalizedModelName,
        )

        if (matchedKey) {
          return calculateTokenCost(matchedKey, usage)
        }

        return null
      }
    }
  }

  const inputTokens = usage.input_tokens || 0
  const outputTokens = usage.output_tokens || 0

  const inputCostPerToken = pricing.input_cost_per_token || 0
  const outputCostPerToken = pricing.output_cost_per_token || 0

  const inputCost = inputTokens * inputCostPerToken
  const outputCost = outputTokens * outputCostPerToken
  const totalCost = inputCost + outputCost

  return {
    inputCost,
    outputCost,
    totalCost,
    currency: 'USD',
  }
}

/**
 * Format cost for display
 */
export function formatCost(cost: number, _currency = 'USD'): string {
  if (cost === 0) {
    return 'Free'
  }

  if (cost < 0.0001) {
    // For very small costs, show in scientific notation or micro-cents
    return `< $0.0001`
  }

  if (cost < 0.01) {
    // Show more decimal places for small costs
    return `$${cost.toFixed(6)}`
  }

  return `$${cost.toFixed(4)}`
}

/**
 * Normalize model name for matching
 */
function normalizeModelName(modelName: string): string {
  return modelName
    .toLowerCase()
    .replaceAll(/[_-]/g, '')
    .replaceAll(/\s+/g, '')
}

/**
 * Extract model name from provider/model format
 */
function extractModelName(modelName: string): string {
  // Handle provider/model format (e.g., "openai/gpt-4.1-nano" -> "gpt-4.1-nano")
  const parts = modelName.split('/')
  return parts.length > 1 ? parts[parts.length - 1] : modelName
}

/**
 * Get all available models with pricing
 */
export function getAvailableModels(): string[] {
  return Object.keys(modelPricing)
}

/**
 * Check if a model has pricing data
 */
export function hasModelPricing(modelName: string): boolean {
  if ((modelPricing as any)[modelName]) {
    return true
  }

  // Try with openrouter/ prefix
  const openrouterModelName = `openrouter/${modelName}`
  if ((modelPricing as any)[openrouterModelName]) {
    return true
  }

  // Try extracting model name from provider/model format
  const extractedModelName = extractModelName(modelName)
  if ((modelPricing as any)[extractedModelName]) {
    return true
  }

  const normalizedModelName = normalizeModelName(extractedModelName)
  return Object.keys(modelPricing).some(key =>
    normalizeModelName(key) === normalizedModelName,
  )
}
