import { useDexieStorage } from './useDexieStorage'

type ThemeScheme = 'auto' | 'dark' | 'light'

export function useTheme() {
  const scheme = useDexieStorage<ThemeScheme>('scheme', 'dark')

  const applyTheme = (themeScheme: ThemeScheme = scheme.value) => {
    let finalScheme: 'dark' | 'light'

    if (themeScheme === 'auto') {
      const prefersDark = globalThis.matchMedia && globalThis.matchMedia('(prefers-color-scheme: dark)').matches
      finalScheme = prefersDark ? 'dark' : 'light'
    }
    else {
      finalScheme = themeScheme
    }

    document.documentElement.dataset.scheme = finalScheme
    document.body.dataset.scheme = finalScheme
  }

  watch(scheme, applyTheme, { immediate: true })

  const setTheme = (newScheme: ThemeScheme) => {
    scheme.value = newScheme
  }

  return {
    scheme,
    setTheme,
    applyTheme,
  }
}
