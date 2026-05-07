// 远程价格数据服务
const LITELLM_PRICING_URL
  = 'https://raw.githubusercontent.com/BerriAI/litellm/main/model_prices_and_context_window.json'
const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models'
const CACHE_KEY = 'model_pricing_cache_v2'
const CACHE_EXPIRY_KEY = 'model_pricing_cache_v2_expiry'
const CACHE_DURATION = 1000 * 60 * 60 // 1小时缓存
const MODEL_NAME_SEPARATORS_REGEXP = /[_-]/g
const WHITESPACE_REGEXP = /\s+/g

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

let cachedPricing: Record<string, ModelPricing> | null = null
let fetchPromise: Promise<Record<string, ModelPricing>> | null = null

/**
 * 获取价格数据，优先从缓存读取
 */
async function getPricingData(): Promise<Record<string, ModelPricing>> {
  // 检查内存缓存
  if (cachedPricing) {
    return cachedPricing
  }

  // 检查 localStorage 缓存
  const cachedData = localStorage.getItem(CACHE_KEY)
  const cacheExpiry = localStorage.getItem(CACHE_EXPIRY_KEY)

  if (cachedData && cacheExpiry && Date.now() < Number.parseInt(cacheExpiry)) {
    try {
      cachedPricing = JSON.parse(cachedData)
      return cachedPricing!
    }
    catch (error) {
      console.warn('Failed to parse cached pricing data:', error)
    }
  }

  // 如果已经在请求中，返回同一个Promise
  if (fetchPromise) {
    return fetchPromise
  }

  // 发起新的请求
  fetchPromise = (async () => {
    // 并行请求 OpenRouter 和 LiteLLM，OpenRouter 优先
    const [openrouterPricing, litellmPricing] = await Promise.all([
      fetchOpenRouterPricing(),
      fetchLiteLLMPricing().catch(() => {
        // LiteLLM 失败时尝试使用过期缓存
        const cachedData = localStorage.getItem(CACHE_KEY)
        if (cachedData) {
          try {
            console.warn('Using expired cached pricing data as fallback')
            return JSON.parse(cachedData)
          }
          catch {
            return {} as Record<string, ModelPricing>
          }
        }
        return {} as Record<string, ModelPricing>
      }),
    ])

    // 合并：LiteLLM 作为基础，OpenRouter 覆盖
    const merged = { ...litellmPricing, ...openrouterPricing }
    cachedPricing = merged

    localStorage.setItem(CACHE_KEY, JSON.stringify(merged))
    localStorage.setItem(
      CACHE_EXPIRY_KEY,
      (Date.now() + CACHE_DURATION).toString(),
    )

    return merged
  })()

  try {
    const data = await fetchPromise
    return data
  }
  finally {
    fetchPromise = null
  }
}

/**
 * 从 OpenRouter API 获取模型定价数据
 */
async function fetchOpenRouterPricing(): Promise<Record<string, ModelPricing>> {
  try {
    const response = await fetch(OPENROUTER_MODELS_URL)
    if (!response.ok) {
      throw new Error(`OpenRouter HTTP ${response.status}`)
    }
    const json = await response.json()
    const pricing: Record<string, ModelPricing> = {}
    for (const model of json.data ?? []) {
      if (model.id && model.pricing) {
        pricing[model.id] = {
          input_cost_per_token: Number.parseFloat(model.pricing.prompt) || 0,
          output_cost_per_token: Number.parseFloat(model.pricing.completion) || 0,
          litellm_provider: 'openrouter',
        }
      }
    }
    return pricing
  }
  catch (error) {
    console.warn('Failed to fetch OpenRouter pricing:', error)
    return {}
  }
}

/**
 * 从 LiteLLM GitHub 获取模型定价数据
 */
async function fetchLiteLLMPricing(): Promise<Record<string, ModelPricing>> {
  try {
    const response = await fetch(LITELLM_PRICING_URL, {
      cache: 'no-cache',
    })
    if (!response.ok) {
      throw new Error(`LiteLLM HTTP ${response.status}: ${response.statusText}`)
    }
    return await response.json()
  }
  catch (error) {
    console.error('Failed to fetch LiteLLM pricing:', error)
    throw error
  }
}

/**
 * 提取模型名称（处理 provider/model 格式）
 */
function extractModelName(modelName: string): string {
  const parts = modelName.split('/')
  return parts.length > 1 ? parts.at(-1) || modelName : modelName
}

/**
 * 标准化模型名称用于匹配
 */
function normalizeModelName(modelName: string): string {
  return modelName
    .toLowerCase()
    .replaceAll(MODEL_NAME_SEPARATORS_REGEXP, '')
    .replaceAll(WHITESPACE_REGEXP, '')
}

/**
 * 计算 token 使用的费用
 */
export async function calculateTokenCost(
  modelName: string,
  usage: TokenUsage,
): Promise<CostCalculation | null> {
  if (!usage) {
    return null
  }

  try {
    const pricingData = await getPricingData()

    // 查找价格数据
    let pricing = pricingData[modelName] as ModelPricing | undefined

    if (!pricing) {
      // 尝试添加 openrouter/ 前缀（适用于 OpenRouter）
      const openrouterModelName = `openrouter/${modelName}`
      pricing = pricingData[openrouterModelName] as ModelPricing | undefined

      if (!pricing) {
        // 尝试提取模型名称
        const extractedModelName = extractModelName(modelName)
        pricing = pricingData[extractedModelName] as ModelPricing | undefined

        if (!pricing) {
          // 尝试标准化匹配：对 pricing key 也先提取模型名再标准化
          const normalizedModelName = normalizeModelName(extractedModelName)
          const matchedKey = Object.keys(pricingData).find((key) => {
            const keyNormalized = normalizeModelName(key)
            const keyExtracted = extractModelName(key)
            const keyExtractedNormalized = normalizeModelName(keyExtracted)
            return (
              keyNormalized === normalizedModelName
              || keyExtractedNormalized === normalizedModelName
            )
          })

          if (matchedKey) {
            pricing = pricingData[matchedKey]
          }
        }
      }
    }

    if (!pricing) {
      console.warn(
        `[pricing] No pricing found for model "${modelName}"`,
      )
      return null
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
  catch (error) {
    console.error('Failed to calculate token cost:', error)
    return null
  }
}

/**
 * 格式化费用显示
 */
export function formatCost(cost: number, _currency = 'USD'): string {
  if (cost === 0) {
    return 'Free'
  }

  if (cost < 0.0001) {
    return `< $0.0001`
  }

  if (cost < 0.01) {
    return `$${cost.toFixed(6)}`
  }

  return `$${cost.toFixed(4)}`
}

/**
 * 检查模型是否有价格数据
 */
export async function hasModelPricing(modelName: string): Promise<boolean> {
  try {
    const pricingData = await getPricingData()

    if (pricingData[modelName]) {
      return true
    }

    // 尝试 openrouter/ 前缀
    const openrouterModelName = `openrouter/${modelName}`
    if (pricingData[openrouterModelName]) {
      return true
    }

    // 尝试提取模型名称
    const extractedModelName = extractModelName(modelName)
    if (pricingData[extractedModelName]) {
      return true
    }

    const normalizedModelName = normalizeModelName(extractedModelName)
    return Object.keys(pricingData).some((key) => {
      const keyExtracted = extractModelName(key)
      return (
        normalizeModelName(key) === normalizedModelName
        || normalizeModelName(keyExtracted) === normalizedModelName
      )
    })
  }
  catch (error) {
    console.error('Failed to check model pricing:', error)
    return false
  }
}

/**
 * 获取所有可用模型列表
 */
export async function getAvailableModels(): Promise<string[]> {
  try {
    const pricingData = await getPricingData()
    return Object.keys(pricingData)
  }
  catch (error) {
    console.error('Failed to get available models:', error)
    return []
  }
}

/**
 * 清除缓存（用于强制刷新）
 */
export function clearPricingCache(): void {
  cachedPricing = null
  localStorage.removeItem(CACHE_KEY)
  localStorage.removeItem(CACHE_EXPIRY_KEY)
}
