import { nextTick, ref, type Ref, watch } from 'vue'
import { getSetting, setSetting } from './useDatabase'

export function useDexieStorage<T = string>(
  key: string,
  defaultValue: T,
): Ref<T> {
  const storedValue = ref(defaultValue) as Ref<T>
  let isLoading = true

  const load = async () => {
    try {
      const value = await getSetting(key, String(defaultValue))
      if (value !== undefined && value !== String(defaultValue)) {
        storedValue.value = value as T
      }
      isLoading = false
    }
    catch (error) {
      console.error(`Error loading setting ${key}:`, error)
      storedValue.value = defaultValue
      isLoading = false
    }
  }

  const save = async (value: T) => {
    if (isLoading) {
      return
    } // 避免在加载期间保存默认值

    try {
      await setSetting(key, String(value))
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

  return storedValue
}

export function useDexieRef<T = string>(
  keyRef: Ref<string>,
  defaultValue: T,
): Ref<T> {
  const storedValue = ref(defaultValue) as Ref<T>
  let isLoading = true

  const load = async (key: string) => {
    try {
      const value = await getSetting(key, String(defaultValue))
      storedValue.value = value !== undefined && value !== String(defaultValue) ? value as T : defaultValue
      isLoading = false
    }
    catch (error) {
      console.error(`Error loading setting ${key}:`, error)
      storedValue.value = defaultValue
      isLoading = false
    }
  }

  const save = async (key: string, value: T) => {
    if (isLoading) {
      return
    }

    try {
      await setSetting(key, String(value))
    }
    catch (error) {
      console.error(`Error saving setting ${key}:`, error)
    }
  }

  // 初始加载
  load(keyRef.value)

  // 监听 key 变化
  watch(
    keyRef,
    (newKey) => {
      isLoading = true
      load(newKey)
    },
    { immediate: false },
  )

  // 监听值变化并保存
  watch(
    storedValue,
    (newValue) => {
      nextTick(() => {
        save(keyRef.value, newValue)
      })
    },
    { deep: true },
  )

  return storedValue
}
