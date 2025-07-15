import { primaryColor } from '@roku-ui/vue'
import { createApp } from 'vue'
import App from './App.vue'
import { useMigration } from './composables/useMigration'
import { router } from './router/router'
import './composables/useDatabaseReset'

import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

async function initializeApp() {
  const { checkAndRunMigration } = useMigration()
  await checkAndRunMigration()

  primaryColor.value = '#9b95b8'
  const app = createApp(App)
  app.use(router)
  app.mount('#app')
}

await initializeApp()
