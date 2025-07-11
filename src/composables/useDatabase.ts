import Dexie, { type Table } from 'dexie'

export interface Setting {
  id?: number
  key: string
  value: string
  createdAt: number
  updatedAt: number
}

export interface ChatData {
  id: string
  title: string
  messages: Array<{
    id: string
    role: 'user' | 'assistant' | 'system'
    content: string
    timestamp: number
  }>
  createdAt: number
  updatedAt: number
}

export interface RequestCacheEntry {
  id?: number
  cacheKey: string
  key: {
    preset: string
    serviceUrl: string
    model: string
    apiKey: string
  }
  timestamp: number
  success: boolean
  accessCount: number
  lastAccessed: number
}

class ChatUIDatabase extends Dexie {
  settings!: Table<Setting>
  chatHistory!: Table<ChatData>
  requestCache!: Table<RequestCacheEntry>

  constructor() {
    super('ChatUIDB_v2')
    this.version(1).stores({
      settings: '++id, &key, createdAt, updatedAt',
      chatHistory: '&id, createdAt, updatedAt',
      requestCache: '++id, cacheKey, timestamp, lastAccessed, accessCount',
    })
  }
}

export const db = new ChatUIDatabase()

export async function cleanupOldDatabases(): Promise<void> {
  try {
    // 清理可能存在的旧数据库实例
    const oldDbName = 'RequestCacheDB'
    if (typeof indexedDB !== 'undefined') {
      const databases = await indexedDB.databases?.() || []
      const hasOldDb = databases.some(dbInfo => dbInfo.name === oldDbName)
      
      if (hasOldDb) {
        console.log('Cleaning up old RequestCacheDB...')
        // 首先尝试迁移旧的缓存数据
        try {
          const Dexie = (await import('dexie')).default
          const oldDb = new Dexie(oldDbName)
          oldDb.version(1).stores({
            requestCache: '++id, cacheKey, timestamp, lastAccessed, accessCount',
          })
          
          const oldData = await oldDb.table('requestCache').toArray()
          if (oldData.length > 0) {
            await db.requestCache.bulkAdd(oldData)
            console.log(`Migrated ${oldData.length} request cache entries`)
          }
          
          oldDb.close()
          oldDb.delete()
        } catch (error) {
          console.warn('Could not migrate old cache data:', error)
        }
      }
    }
  } catch (error) {
    console.warn('Error during database cleanup:', error)
  }
}

export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
  try {
    const setting = await db.settings.where('key').equals(key).first()
    return setting?.value ?? defaultValue
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error)
    return defaultValue
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const now = Date.now()
    const existingSetting = await db.settings.where('key').equals(key).first()
    
    if (existingSetting) {
      await db.settings.update(existingSetting.id!, {
        value,
        updatedAt: now,
      })
    } else {
      await db.settings.add({
        key,
        value,
        createdAt: now,
        updatedAt: now,
      })
    }
  } catch (error) {
    console.error(`Error setting ${key}:`, error)
  }
}

export async function removeSetting(key: string): Promise<void> {
  try {
    await db.settings.where('key').equals(key).delete()
  } catch (error) {
    console.error(`Error removing setting ${key}:`, error)
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const settings = await db.settings.toArray()
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {} as Record<string, string>)
  } catch (error) {
    console.error('Error getting all settings:', error)
    return {}
  }
}

export async function migrateFromLocalStorage(): Promise<void> {
  const localStorageKeys = [
    'scheme',
    'serviceUrl',
    'platform',
    'translate.targetLang',
    'translate.tone',
  ]

  const dynamicKeys: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && (key.startsWith('model-') || key.startsWith('apiKey-'))) {
      dynamicKeys.push(key)
    }
  }

  const allKeys = [...localStorageKeys, ...dynamicKeys]
  let migratedCount = 0

  for (const key of allKeys) {
    const value = localStorage.getItem(key)
    if (value !== null) {
      // 检查 Dexie 中是否已经有这个设置
      const existingSetting = await getSetting(key)
      if (existingSetting === undefined) {
        await setSetting(key, value)
        console.log(`Migrated ${key}: ${value}`)
        migratedCount++
      } else {
        console.log(`Skipped ${key} (already exists in Dexie)`)
      }
    }
  }

  if (migratedCount > 0) {
    console.log(`Migration completed. Migrated ${migratedCount} settings.`)
  } else {
    console.log('No new settings to migrate.')
  }
}

export function useDatabase() {
  return {
    getSetting,
    setSetting,
    removeSetting,
    getAllSettings,
    migrateFromLocalStorage,
    cleanupOldDatabases,
    db,
  }
}