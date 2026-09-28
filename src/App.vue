<template>
  <div id="app">
    <!-- 1. 未登入狀態：顯示登入/註冊頁面 -->
    <LoginView 
      v-if="!currentUser" 
      @login-success="handleLoginSuccess" 
    />

    <!-- 2. 已登入狀態 -->
    <template v-else>
      <!-- 頂部用戶狀態列 -->
      <header class="global-user-bar">
        <div class="user-info">
          <span class="user-email">帳號：{{ userProfile?.email }}</span>
          <span class="user-guild">幫會：{{ userProfile?.guilds?.name || '未分配' }}</span>
          <span class="user-role-badge" :class="userProfile?.role">
            {{ getRoleName(userProfile?.role) }}
          </span>
          <span class="expire-tag">
            到期日：{{ userProfile?.expire_at ? userProfile.expire_at.split('T')[0] : '—' }}
          </span>
        </div>

        <div class="user-actions">
          <button 
            v-if="userProfile?.role === 'super_admin'" 
            class="btn-admin-nav"
            @click="currentView = currentView === 'admin' ? 'roster' : 'admin'"
          >
            {{ currentView === 'admin' ? '返回排表' : '⚙️ 總管理員控制台' }}
          </button>
          <button class="btn-logout" @click="handleLogout">登出</button>
        </div>
      </header>

      <!-- 畫面切換：總管理員後台 OR 聯賽排表主頁 -->
      <AdminDashboard 
        v-if="currentView === 'admin' && userProfile?.role === 'super_admin'" 
        @back="currentView = 'roster'" 
      />
      <RosterBoard 
        v-else 
        :leagueItem="leagueInfo" 
        :userProfile="userProfile"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from './utils/supabase'
import LoginView from './views/auth/LoginView.vue'
import RosterBoard from './views/league/RosterBoard.vue'
import AdminDashboard from './views/admin/AdminDashboard.vue'

const currentUser = ref(null)
const userProfile = ref(null)
const currentView = ref('roster') // 'roster' | 'admin'

const leagueInfo = ref({
  title: '幫會聯賽',
  type: '幫會聯賽',
  startTime: '2026-10-10 20:00',
  guild: '百錵谷酒池肉林'
})

const getRoleName = (role) => {
  const map = { super_admin: '總管理員', guild_admin: '幫主/統戰', member: '幫眾' }
  return map[role] || '幫眾'
}

// 檢查當前 Session
const checkSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    currentUser.value = session.user
    await fetchProfile(session.user.id)
  }
}

const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*, guilds(*)')
    .eq('id', userId)
    .single()

  if (!error && data) {
    userProfile.value = data
    if (data.guilds?.name) {
      leagueInfo.value.guild = data.guilds.name
    }
  }
}

const handleLoginSuccess = async ({ user, profile }) => {
  currentUser.value = user
  userProfile.value = profile
  if (profile.guilds?.name) {
    leagueInfo.value.guild = profile.guilds.name
  }
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  currentUser.value = null
  userProfile.value = null
  currentView.value = 'roster'
}

onMounted(checkSession)
</script>

<style>
.global-user-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 16px;
  background: #1e293b;
  color: white;
  font-size: 12px;
}
.user-info { display: flex; align-items: center; gap: 12px; }
.user-role-badge {
  background: #475569;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 10px;
}
.user-role-badge.super_admin { background: #ef4444; }
.user-role-badge.guild_admin { background: #3b82f6; }
.expire-tag { color: #cbd5e1; }
.btn-admin-nav { background: #eab308; color: #1e293b; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 8px; }
.btn-logout { background: #475569; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
</style>