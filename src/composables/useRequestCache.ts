import type { RequestCacheEntry } from './useDatabase'
import { db } from './useDatabase'

export interface RequestCacheKey {
  preset: string
  serviceUrl: string
  model: string
  apiKey: string
}

// Increase cache capacity and extend TTL to reduce unintended evictions
const MAX_CACHE_SIZE = 32
const TTL = 1000 * 60 * 60 * 24 * 30 // 30 days

function generateCacheKey(key: RequestCacheKey): string {
  const { preset = '', serviceUrl, model, apiKey } = key
  return `${preset}:${serviceUrl}:${model}:${apiKey.slice(0, 10)}***`
}

// 缓存条目只保留脱敏后的 key 前缀，完整 API key 不落盘
function maskApiKey(apiKey: string): string {
  return apiKey.length > 8 ? `${apiKey.slice(0, 8)}...` : apiKey
}

// 旧版本曾把完整 API key 明文写入缓存，首次访问时一次性脱敏
let sanitizeLegacyPromise: Promise<void> | null = null
function sanitizeLegacyEntries(): Promise<void> {
  sanitizeLegacyPromise ??= (async () => {
    try {
      const entries = await db.requestCache.toArray()
      const dirty = entries.filter(
        entry => entry.key.apiKey !== maskApiKey(entry.key.apiKey),
      )
      await Promise.all(
        dirty.map(entry =>
          db.requestCache.update(entry.id!, {
            key: { ...entry.key, apiKey: maskApiKey(entry.key.apiKey) },
          }),
        ),
      )
    }
    catch (error) {
      console.error('Error sanitizing legacy cache entries:', error)
    }
  })()
  return sanitizeLegacyPromise
}

async function cleanupExpiredEntries() {
  const now = Date.now()
  const expiredTime = now - TTL
  await db.requestCache.where('timestamp').below(expiredTime).delete()
}

async function maintainCacheSize() {
  const count = await db.requestCache.count()
  if (count > MAX_CACHE_SIZE) {
    // Remove oldest entries based on LRU (least recently used)
    const entriesToRemove = await db.requestCache
      .orderBy('lastAccessed')
      .limit(count - MAX_CACHE_SIZE)
      .toArray()

    const idsToRemove = entriesToRemove
      .map(entry => entry.id!)
      .filter(id => id !== undefined)
    await db.requestCache.bulkDelete(idsToRemove)
  }
}

async function cacheSuccessfulRequest(key: RequestCacheKey) {
  const cacheKey = generateCacheKey(key)
  const storedKey: RequestCacheKey = { ...key, apiKey: maskApiKey(key.apiKey) }
  const now = Date.now()

  try {
    await sanitizeLegacyEntries()
    // cacheKey 不是唯一索引，read-then-write 放进事务里避免并发时重复插入
    await db.transaction('rw', db.requestCache, async () => {
      const existingEntry = await db.requestCache
        .where('cacheKey')
        .equals(cacheKey)
        .first()

      await (existingEntry
        ? db.requestCache.update(existingEntry.id!, {
            timestamp: now,
            lastAccessed: now,
            accessCount: existingEntry.accessCount + 1,
            key: storedKey,
            success: true,
          })
        : db.requestCache.add({
            cacheKey,
            key: storedKey,
            timestamp: now,
            success: true,
            accessCount: 1,
            lastAccessed: now,
          }))
    })

    // Cleanup and maintain cache size
    await cleanupExpiredEntries()
    await maintainCacheSize()
  }
  catch (error) {
    console.error('Error caching request:', error)
  }
}

async function getCachedRequest(
  key: RequestCacheKey,
): Promise<RequestCacheEntry | null> {
  const cacheKey = generateCacheKey(key)
  const now = Date.now()

  try {
    const entry = await db.requestCache
      .where('cacheKey')
      .equals(cacheKey)
      .first()

    if (!entry) {
      return null
    }

    // Check if entry is expired
    if (now - entry.timestamp > TTL) {
      await db.requestCache.delete(entry.id!)
      return null
    }

    // Update access information for LRU
    await db.requestCache.update(entry.id!, {
      lastAccessed: now,
      accessCount: entry.accessCount + 1,
    })

    // Return updated entry
    return {
      ...entry,
      lastAccessed: now,
      accessCount: entry.accessCount + 1,
    }
  }
  catch (error) {
    console.error('Error getting cached request:', error)
    return null
  }
}

async function getRecentSuccessfulRequests(
  limit = 10,
): Promise<RequestCacheEntry[]> {
  try {
    await sanitizeLegacyEntries()
    await cleanupExpiredEntries()

    // Order by timestamp to ensure true recency, then filter successes
    const entries = await db.requestCache
      .orderBy('timestamp')
      .reverse()
      .toArray()

    return entries.filter(entry => entry.success).slice(0, limit)
  }
  catch (error) {
    console.error('Error getting recent requests:', error)
    return []
  }
}

async function getTopSuccessfulRequests(
  limit = 10,
): Promise<RequestCacheEntry[]> {
  try {
    await sanitizeLegacyEntries()
    await cleanupExpiredEntries()

    // Order by accessCount descending (most used first)
    const entries = await db.requestCache
      .orderBy('accessCount')
      .reverse()
      .toArray()

    return entries.filter(entry => entry.success).slice(0, limit)
  }
  catch (error) {
    console.error('Error getting top requests:', error)
    return []
  }
}

async function clearCache() {
  try {
    await db.requestCache.clear()
  }
  catch (error) {
    console.error('Error clearing cache:', error)
  }
}

async function getCacheSize(): Promise<number> {
  try {
    await cleanupExpiredEntries()
    return await db.requestCache.count()
  }
  catch (error) {
    console.error('Error getting cache size:', error)
    return 0
  }
}

export function useRequestCache() {
  return {
    cacheSuccessfulRequest,
    getCachedRequest,
    getRecentSuccessfulRequests,
    getTopSuccessfulRequests,
    clearCache,
    getCacheSize,
  }
}
