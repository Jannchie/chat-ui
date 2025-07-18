export async function resetAllDatabases(): Promise<void> {
  if (typeof indexedDB === 'undefined') {
    return
  }

  try {
    // 获取所有数据库
    const databases = await indexedDB.databases?.() || []

    // 删除所有相关数据库
    for (const dbInfo of databases) {
      if (dbInfo.name && (
        dbInfo.name === 'ChatUIDB_v2'
        || dbInfo.name.includes('chat')
        || dbInfo.name.includes('Chat')
      )) {
        const deleteReq = indexedDB.deleteDatabase(dbInfo.name)
        await new Promise((resolve, reject) => {
          deleteReq.onsuccess = () => resolve(undefined)
          deleteReq.addEventListener('error', () => reject(deleteReq.error))
        })
      }
    }
  }
  catch (error) {
    console.error('Error resetting databases:', error)
  }
}

// 添加到全局作用域以便在控制台调用
if (globalThis.window !== undefined) {
  (globalThis as any).resetAllDatabases = resetAllDatabases
}
