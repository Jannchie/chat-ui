import { cleanupOldDatabases, getSetting, migrateFromLocalStorage, setSetting } from './useDatabase'

const MIGRATION_VERSION_KEY = 'migration.version'
const CURRENT_MIGRATION_VERSION = '1.0.0'

export function useMigration() {
  const checkAndRunMigration = async () => {
    try {
      // 首先清理旧数据库
      await cleanupOldDatabases()

      const currentVersion = await getSetting(MIGRATION_VERSION_KEY)

      if (!currentVersion || currentVersion !== CURRENT_MIGRATION_VERSION) {
        console.log('Starting migration from localStorage to Dexie...')

        await migrateFromLocalStorage()

        await setSetting(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION)

        console.log('Migration completed successfully!')

        // 只在确实进行了迁移时才提示重新加载
        if (!currentVersion) {
          setTimeout(() => {
            if (confirm('Data migration completed! The page will reload to apply changes. Continue?')) {
              globalThis.location.reload()
            }
          }, 1000)
        }
      }
    }
    catch (error) {
      console.error('Migration failed:', error)
    }
  }

  const forceMigration = async () => {
    console.log('Forcing migration from localStorage to Dexie...')
    await migrateFromLocalStorage()
    await setSetting(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION)
    console.log('Forced migration completed!')
  }

  return {
    checkAndRunMigration,
    forceMigration,
  }
}
