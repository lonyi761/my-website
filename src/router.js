import { createRouter, createWebHistory } from 'vue-router'
import LoginView from './views/auth/LoginView.vue'
import Members from './views/Members.vue'
import League from './views/League.vue'
import Preparation from './views/Preparation.vue'

const routes = [
  { path: '/', redirect: '/members' },
  { path: '/login', name: 'Login', component: LoginView },
  { path: '/members', name: 'Members', component: Members },
  { path: '/league', name: 'League', component: League },
  { path: '/preparation', name: 'Preparation', component: Preparation },
  { path: '/:pathMatch(.*)*', redirect: '/members' }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router