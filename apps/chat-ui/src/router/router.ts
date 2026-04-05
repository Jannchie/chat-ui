import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('../views/Chat.vue'),
  },
  {
    path: '/chat',
    children: [
      {
        name: 'chat-home',
        path: '',
        component: () => import('../views/Chat.vue'),
      },
      {
        name: 'chat',
        path: ':id',
        component: () => import('../views/Chat.vue'),
      },
    ],
  },
  {
    name: 'translate',
    path: '/translate',
    component: () => import('../views/Translate.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
