import { cleanupOldDatabases, getSetting, migrateFromLocalStorage, setSetting } from './useDatabase'

const MIGRATION_VERSION_KEY = 'migration.version'
const CURRENT_MIGRATION_VERSION = '1.0.0'

async function checkAndRunMigration() {
  try {
    await cleanupOldDatabases()
    const currentVersion = await getSetting(MIGRATION_VERSION_KEY)
    if (!currentVersion || currentVersion !== CURRENT_MIGRATION_VERSION) {
      await migrateFromLocalStorage()
      await setSetting(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION)
    }
  }
  catch (error) {
    console.error('Migration failed:', error)
  }
}
async function forceMigration() {
  await migrateFromLocalStorage()
  await setSetting(MIGRATION_VERSION_KEY, CURRENT_MIGRATION_VERSION)
}
export function useMigration() {
  return {
    checkAndRunMigration,
    forceMigration,
  }
}
