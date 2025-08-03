import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router/router'
import './composables/useDatabaseReset'

import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

const app = createApp(App)
app.use(router)
app.mount('#app')
