import { primaryColor } from '@roku-ui/vue'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router/router'
import { useMigration } from './composables/useMigration'
import './composables/useDatabaseReset'

import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'
import 'katex/dist/katex.min.css'

async function initializeApp() {
  const { checkAndRunMigration } = useMigration()
  await checkAndRunMigration()

  primaryColor.value = '#9b95b8'
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}

initializeApp().catch(console.error)
