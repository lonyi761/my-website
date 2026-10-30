import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/auth/LoginView.vue'

// 各頁面用到時才載入，首次開啟網站下載的程式較少
const routes = [
  { path: '/', redirect: '/members' },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/members', name: 'Members', component: () => import('./views/Members.vue') },
  { path: '/league', name: 'League', component: () => import('./views/League.vue') },
  { path: '/preparation', name: 'Preparation', component: () => import('./views/Preparation.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/members' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router