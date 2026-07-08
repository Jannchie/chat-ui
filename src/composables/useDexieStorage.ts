import type { Ref } from 'vue'
import { nextTick, ref, watch } from 'vue'
import { getSetting, setSetting } from './useDatabase'

export function useDexieStorage<T = string>(
  key: string,
  defaultValue: T,
): Ref<T> & { isLoaded: Ref<boolean> } {
  const storedValue = ref(defaultValue) as Ref<T>
  const isLoaded = ref(false)
  let isLoading = true
  // 加载完成前用户已写入：加载结果不得覆盖，且写入需在加载后落盘
  let pendingWrite = false

  const save = async (value: T) => {
    if (isLoading) {
      // 加载期间不保存默认值，但用户写入要在加载完成后补写
      pendingWrite = true
      return
    }

    try {
      const stringValue
        = typeof value === 'string' ? value : JSON.stringify(value)
      await setSetting(key, stringValue)
    }
    catch (error) {
      console.error(`Error saving setting ${key}:`, error)
    }
  }

  const load = async () => {
    try {
      const value = await getSetting(key)
      if (value !== undefined && !pendingWrite) {
        try {
          // 尝试解析JSON，如果失败则直接使用字符串值
          storedValue.value
            = typeof defaultValue === 'string'
              ? (value as T)
              : (JSON.parse(value) as T)
        }
        catch {
          // JSON解析失败，使用原始字符串值
          storedValue.value = value as T
        }
      }
    }
    catch (error) {
      console.error(`Error loading setting ${key}:`, error)
      if (!pendingWrite) {
        storedValue.value = defaultValue
      }
    }
    finally {
      isLoading = false
      isLoaded.value = true
      if (pendingWrite) {
        save(storedValue.value)
      }
    }
  }

  // 异步加载初始值
  load()

  // 监听变化并保存
  watch(
    storedValue,
    (newValue) => {
      // 同步标记加载窗口内的写入，防止 load 完成时覆盖
      if (isLoading) {
        pendingWrite = true
      }
      // 使用 nextTick 确保不会在组件初始化期间触发保存
      nextTick(() => {
        save(newValue)
      })
    },
    { deep: true },
  )

  // 创建一个包含 isLoaded 属性的对象
  const result = storedValue as Ref<T> & { isLoaded: Ref<boolean> }
  result.isLoaded = isLoaded

  return result
}
