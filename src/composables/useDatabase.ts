import type { Table } from 'dexie'
import Dexie from 'dexie'

export interface Setting {
  id?: number
  key: string
  value: string
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

export async function getSetting(key: string, defaultValue?: string): Promise<string | undefined> {
  try {
    const setting = await db.settings.where('key').equals(key).first()
    return setting?.value ?? defaultValue
  }
  catch (error) {
    console.error(`Error getting setting ${key}:`, error)
    return defaultValue
  }
}

export async function setSetting(key: string, value: string): Promise<void> {
  try {
    const now = Date.now()
    const existingSetting = await db.settings.where('key').equals(key).first()

    await (existingSetting
      ? db.settings.update(existingSetting.id!, {
          value,
          updatedAt: now,
        })
      : db.settings.add({
          key,
          value,
          createdAt: now,
          updatedAt: now,
        }))
  }
  catch (error) {
    console.error(`Error setting ${key}:`, error)
  }
}

export async function removeSetting(key: string): Promise<void> {
  try {
    await db.settings.where('key').equals(key).delete()
  }
  catch (error) {
    console.error(`Error removing setting ${key}:`, error)
  }
}

export async function getAllSettings(): Promise<Record<string, string>> {
  try {
    const settings = await db.settings.toArray()
    const result: Record<string, string> = {}
    for (const setting of settings) {
      result[setting.key] = setting.value
    }
    return result
  }
  catch (error) {
    console.error('Error getting all settings:', error)
    return {}
  }
}

export function useDatabase() {
  return {
    getSetting,
    setSetting,
    removeSetting,
    getAllSettings,
    db,
  }
}
