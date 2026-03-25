import { useLocalStorage } from '@vueuse/core'
import { computed, ref, watchEffect } from 'vue'

export interface OpenRouterModel {
  id: string
  name: string
  context_length: number
  supported_parameters: string[]
  top_provider: {
    context_length: number
    max_completion_tokens: number
    is_moderated: boolean
  }
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[]
}

interface CachedModelsData {
  models: OpenRouterModel[]
  fetchedAt: number
}

const CACHE_KEY = 'openrouter-models-cache'
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

const cachedData = useLocalStorage<CachedModelsData | null>(CACHE_KEY, null)
const loading = ref(false)
const error = ref<string | null>(null)

let fetchPromise: Promise<void> | null = null

async function fetchModels(): Promise<void> {
  if (loading.value) {
    return fetchPromise ?? Promise.resolve()
  }

  loading.value = true
  error.value = null

  fetchPromise = fetch('https://openrouter.ai/api/v1/models')
    .then(async (res) => {
      if (!res.ok) {
        throw new Error(`OpenRouter API error: ${res.status}`)
      }
      const json: OpenRouterModelsResponse = await res.json()
      cachedData.value = {
        models: json.data.map(m => ({
          id: m.id,
          name: m.name,
          context_length: m.context_length,
          supported_parameters: m.supported_parameters ?? [],
          top_provider: m.top_provider,
        })),
        fetchedAt: Date.now(),
      }
    })
    .catch((error_) => {
      error.value = error_ instanceof Error ? error_.message : String(error_)
    })
    .finally(() => {
      loading.value = false
      fetchPromise = null
    })

  return fetchPromise
}

const models = computed(() => cachedData.value?.models ?? [])

function isCacheValid(): boolean {
  return (
    cachedData.value !== null
    && Date.now() - cachedData.value.fetchedAt < CACHE_TTL
  )
}

function ensureModels(): void {
  if (!isCacheValid()) {
    fetchModels()
  }
}

/**
 * Find a model by matching the model ID.
 * Tries exact match first, then tries with common provider prefixes.
 */
function findModel(modelId: string): OpenRouterModel | undefined {
  if (!modelId) {
    return undefined
  }
  const list = models.value
  // Exact match
  const exact = list.find(m => m.id === modelId)
  if (exact) {
    return exact
  }
  // Match by suffix (e.g., "gpt-5.2-pro" matches "openai/gpt-5.2-pro")
  return list.find(m => m.id.endsWith(`/${modelId}`))
}

function modelSupportsReasoning(modelId: string): boolean {
  const m = findModel(modelId)
  return m?.supported_parameters.includes('reasoning') ?? false
}

function modelSupportsReasoningEffort(modelId: string): boolean {
  const m = findModel(modelId)
  return m?.supported_parameters.includes('reasoning_effort') ?? false
}

function getSupportedParameters(modelId: string): string[] {
  const m = findModel(modelId)
  return m?.supported_parameters ?? []
}

export function useOpenRouterModels() {
  watchEffect(() => {
    ensureModels()
  })

  return {
    models,
    loading,
    error,
    fetchModels,
    findModel,
    getSupportedParameters,
    modelSupportsReasoning,
    modelSupportsReasoningEffort,
  }
}
