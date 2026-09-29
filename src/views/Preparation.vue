<template>
  <div class="prep-layout light-theme">
    <!-- 全局頂部導航列 -->
    <Navbar 
      activeNav="preparation" 
      :username="username" 
    />

    <!-- 主要內容區 -->
    <div class="prep-main">
      <!-- 左側選單 -->
      <aside class="prep-sidebar">
        <ul class="sidebar-menu">
          <li :class="{ active: currentTab === 'roles' }" @click="currentTab = 'roles'">職能管理</li>
          <li :class="{ active: currentTab === 'skill' }" @click="currentTab = 'skill'">技能管理</li>
          <li :class="{ active: currentTab === 'template' }" @click="currentTab = 'template'">排表模板</li>
          <li :class="{ active: currentTab === 'faq' }" @click="currentTab = 'faq'">報名問題</li>
        </ul>
      </aside>

      <!-- 右側子組件切換 -->
      <main class="content-area">
        <RoleManagement v-if="currentTab === 'roles'" />
        <SkillManagement v-else-if="currentTab === 'skill'" />
        <LineupTemplate v-else-if="currentTab === 'template'" />
        <QuestionConfig v-else-if="currentTab === 'faq'" />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../utils/supabase'
import Navbar from '../components/layout/Navbar.vue'
import RoleManagement from './preparation/RoleManagement.vue'
import SkillManagement from './preparation/SkillManagement.vue'
import LineupTemplate from './preparation/LineupTemplate.vue'
import QuestionConfig from './preparation/QuestionConfig.vue'

const router = useRouter()
const username = ref('VIP')
const currentTab = ref('roles')

const checkAuth = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    username.value = session.user.email.split('@')[0]
  } else {
    const user = JSON.parse(localStorage.getItem('user'))
    if (user) username.value = user.username
    else router.push('/login')
  }
}

onMounted(checkAuth)
</script>

<style scoped>
.prep-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.light-theme { background-color: #f4f6f9; color: #2c3e50; }

.prep-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }
.prep-sidebar { width: 180px; background: #ffffff; border-radius: 8px; padding: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-menu { list-style: none; padding: 0; margin: 0; }
.sidebar-menu li { padding: 12px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 4px; color: #64748b; transition: all 0.2s; }
.sidebar-menu li.active, .sidebar-menu li:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
</style>