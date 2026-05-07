import { jannchieDark } from '@jannchie/shiki-theme'
import { configureShiki } from '@preferred-markdown-stream/vue'
import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router/router'
import '@preferred-markdown-stream/vue/styles.css'
import '@unocss/reset/tailwind.css'
import 'virtual:uno.css'

// Use night theme for code highlighting
configureShiki({ theme: jannchieDark })

const app = createApp(App)
app.use(router)
app.mount('#app')
