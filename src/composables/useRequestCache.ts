import type { RequestCacheEntry } from './useDatabase'
import { db } from './useDatabase'

export interface RequestCacheKey {
  preset: string
  serviceUrl: string
  model: string
  apiKey: string
}

const MAX_CACHE_SIZE = 100
const TTL = 1000 * 60 * 30 // 30 minutes

function generateCacheKey(key: RequestCacheKey): string {
  const { preset = '', serviceUrl, model, apiKey } = key
  return `${preset}:${serviceUrl}:${model}:${apiKey.slice(0, 10)}***`
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

    const idsToRemove = entriesToRemove.map(entry => entry.id!).filter(id => id !== undefined)
    await db.requestCache.bulkDelete(idsToRemove)
  }
}

async function cacheSuccessfulRequest(key: RequestCacheKey) {
  const cacheKey = generateCacheKey(key)
  const now = Date.now()

  try {
    // Check if entry already exists
    const existingEntry = await db.requestCache.where('cacheKey').equals(cacheKey).first()

    existingEntry
      ? await db.requestCache.update(existingEntry.id!, {
          timestamp: now,
          lastAccessed: now,
          accessCount: existingEntry.accessCount + 1,
          key,
          success: true,
        })
      : await db.requestCache.add({
          cacheKey,
          key,
          timestamp: now,
          success: true,
          accessCount: 1,
          lastAccessed: now,
        })

    // Cleanup and maintain cache size
    await cleanupExpiredEntries()
    await maintainCacheSize()
  }
  catch (error) {
    console.error('Error caching request:', error)
  }
}

async function getCachedRequest(key: RequestCacheKey): Promise<RequestCacheEntry | null> {
  const cacheKey = generateCacheKey(key)
  const now = Date.now()

  try {
    const entry = await db.requestCache.where('cacheKey').equals(cacheKey).first()

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

async function getRecentSuccessfulRequests(limit = 10): Promise<RequestCacheEntry[]> {
  try {
    await cleanupExpiredEntries()

    const entries = await db.requestCache
      .filter(entry => entry.success)
      .toArray()

    return entries.toReversed().slice(0, limit)
  }
  catch (error) {
    console.error('Error getting recent requests:', error)
    return []
  }
}

async function getTopSuccessfulRequests(limit = 10): Promise<RequestCacheEntry[]> {
  try {
    await cleanupExpiredEntries()

    const entries = await db.requestCache
      .orderBy('accessCount')
      .filter(entry => entry.success)
      .toArray()

    return entries.toReversed().slice(0, limit)
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
