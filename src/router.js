import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Login from './views/Login.vue'
import Members from './views/Members.vue'
import Preparation from './views/Preparation.vue'
import League from './views/League.vue' // 新增引入

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/home', component: Home },
  { path: '/members', component: Members },
  { path: '/preparation', component: Preparation },
  { path: '/league', component: League } // 新增路由
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router