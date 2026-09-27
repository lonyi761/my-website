import { createRouter, createWebHashHistory } from 'vue-router'
import Login from './views/Login.vue'
import Home from './views/Home.vue'
import Profile from './views/Profile.vue'

const routes = [
  { path: '/', redirect: '/login' },
  { path: '/login', component: Login },
  { path: '/home', component: Home },
  { path: '/profile', component: Profile }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router