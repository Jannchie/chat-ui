import { beforeEach, describe, expect, it } from 'vitest'
import { useRequestCache } from '../composables/useRequestCache'

describe('userequestcache', () => {
  const { cacheSuccessfulRequest, getCachedRequest, getRecentSuccessfulRequests, getTopSuccessfulRequests, clearCache, getCacheSize } = useRequestCache()

  beforeEach(async () => {
    await clearCache()
  })

  it('should cache successful requests', async () => {
    const requestKey = {
      preset: 'openai',
      serviceUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      apiKey: 'sk-test123',
    }

    expect(await getCacheSize()).toBe(0)

    await cacheSuccessfulRequest(requestKey)

    expect(await getCacheSize()).toBe(1)

    const cached = await getCachedRequest(requestKey)
    expect(cached).toBeTruthy()
    expect(cached?.key).toEqual(requestKey)
    expect(cached?.success).toBe(true)
    expect(cached?.timestamp).toBeTypeOf('number')
    expect(cached?.accessCount).toBe(2) // 1 for cache + 1 for get
  })

  it('should get recent successful requests', async () => {
    const requestKey1 = {
      preset: 'openai',
      serviceUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      apiKey: 'sk-test123',
    }

    const requestKey2 = {
      preset: 'anthropic',
      serviceUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3',
      apiKey: 'sk-test456',
    }

    await cacheSuccessfulRequest(requestKey1)
    await cacheSuccessfulRequest(requestKey2)

    const recent = await getRecentSuccessfulRequests()
    expect(recent).toHaveLength(2)
    expect(recent[0].key).toEqual(requestKey2) // Most recent first
    expect(recent[1].key).toEqual(requestKey1)
  })

  it('should clear cache', async () => {
    const requestKey = {
      preset: 'openai',
      serviceUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      apiKey: 'sk-test123',
    }

    await cacheSuccessfulRequest(requestKey)
    expect(await getCacheSize()).toBe(1)

    await clearCache()
    expect(await getCacheSize()).toBe(0)
  })

  it('should generate unique cache keys for different configurations', async () => {
    const requestKey1 = {
      preset: 'openai',
      serviceUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      apiKey: 'sk-test123',
    }

    const requestKey2 = {
      preset: 'openai',
      serviceUrl: 'https://api.openai.com/v1',
      model: 'gpt-3.5-turbo',
      apiKey: 'sk-test123',
    }

    await cacheSuccessfulRequest(requestKey1)
    await cacheSuccessfulRequest(requestKey2)

    expect(await getCacheSize()).toBe(2)
    expect(await getCachedRequest(requestKey1)).toBeTruthy()
    expect(await getCachedRequest(requestKey2)).toBeTruthy()
  })

  it('should update existing entries and maintain access count', async () => {
    const requestKey = {
      preset: 'openai',
      serviceUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      apiKey: 'sk-test123',
    }

    await cacheSuccessfulRequest(requestKey)
    await cacheSuccessfulRequest(requestKey) // Cache same request again

    expect(await getCacheSize()).toBe(1) // Should still be 1 entry

    const cached = await getCachedRequest(requestKey)
    expect(cached?.accessCount).toBe(3) // 1 + 1 (update) + 1 (get)
  })

  it('should get top successful requests by access count', async () => {
    const requestKey1 = {
      preset: 'openai',
      serviceUrl: 'https://api.openai.com/v1',
      model: 'gpt-4',
      apiKey: 'sk-test123',
    }

    const requestKey2 = {
      preset: 'anthropic',
      serviceUrl: 'https://api.anthropic.com/v1',
      model: 'claude-3',
      apiKey: 'sk-test456',
    }

    // Cache first request multiple times to increase access count
    await cacheSuccessfulRequest(requestKey1)
    await cacheSuccessfulRequest(requestKey1)
    await cacheSuccessfulRequest(requestKey1)

    // Cache second request only once
    await cacheSuccessfulRequest(requestKey2)

    const topRequests = await getTopSuccessfulRequests()
    expect(topRequests).toHaveLength(2)
    expect(topRequests[0].key).toEqual(requestKey1) // Most accessed first
    expect(topRequests[1].key).toEqual(requestKey2)
    expect(topRequests[0].accessCount).toBeGreaterThan(topRequests[1].accessCount)
  })
})
