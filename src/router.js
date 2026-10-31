import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/auth/LoginView.vue'
import { supabase } from './utils/supabase'

// 各頁面用到時才載入，首次開啟網站下載的程式較少
const routes = [
  { path: '/', redirect: '/members' },
  { path: '/login', name: 'Login', component: LoginView, meta: { public: true } },
  { path: '/members', name: 'Members', component: () => import('./views/Members.vue') },
  { path: '/league', name: 'League', component: () => import('./views/League.vue') },
  { path: '/preparation', name: 'Preparation', component: () => import('./views/Preparation.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/members' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 統一登入檢查：沒登入時一律先到登入頁（不會先載入、閃過其他頁面），登入後回到原本要去的頁面
// 停權、到期等帳號狀態仍由 App.vue 讀取個人資料後判斷
router.beforeEach(async (to) => {
  if (to.meta.public) return true
  const { data: { session } } = await supabase.auth.getSession()
  if (session) return true
  return to.fullPath === '/members' ? { path: '/login' } : { path: '/login', query: { redirect: to.fullPath } }
})

// 只接受站內路徑，避免 ?redirect= 被帶到其他網站
export const safeRedirect = (value) => (typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/login') ? value : '/members')

export default router
