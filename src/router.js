import { createRouter, createWebHashHistory } from 'vue-router'
import Login from './views/Login.vue'
import Home from './views/Home.vue'
import Profile from './views/Profile.vue'
import Members from './views/Members.vue' // 1. 引用成員頁面

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/home', component: Home },
  { path: '/profile', component: Profile },
  { path: '/members', component: Members } // 2. 新增成員頁面路由
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router