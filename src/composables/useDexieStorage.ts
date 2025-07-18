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

  const load = async () => {
    try {
      const value = await getSetting(key)
      if (value !== undefined) {
        try {
          // 尝试解析JSON，如果失败则直接使用字符串值
          storedValue.value = typeof defaultValue === 'string' ? value as T : JSON.parse(value) as T
        }
        catch {
          // JSON解析失败，使用原始字符串值
          storedValue.value = value as T
        }
      }
      isLoading = false
      isLoaded.value = true
    }
    catch (error) {
      console.error(`Error loading setting ${key}:`, error)
      storedValue.value = defaultValue
      isLoading = false
      isLoaded.value = true
    }
  }

  const save = async (value: T) => {
    if (isLoading) {
      return
    } // 避免在加载期间保存默认值

    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value)
      await setSetting(key, stringValue)
    }
    catch (error) {
      console.error(`Error saving setting ${key}:`, error)
    }
  }

  // 异步加载初始值
  load()

  // 监听变化并保存
  watch(
    storedValue,
    (newValue) => {
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
