import { vi } from 'vitest'
import 'fake-indexeddb/auto'

// Mock console.warn for tests
globalThis.console.warn = vi.fn()
