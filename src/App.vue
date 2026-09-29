<template>
  <div id="app">
    <!-- 全局頂部用戶狀態列 (登入頁不顯示) -->
    <header v-if="currentUser && $route.path !== '/login'" class="global-user-bar">
      <div class="user-info">
        <span class="user-email">帳號：{{ userProfile?.username || userProfile?.email?.split('@')[0] }}</span>
        <span class="user-guild">授權幫會：{{ assignedGuildNamesDisplay }}</span>
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
          @click="isAdminView = !isAdminView"
        >
          {{ isAdminView ? '返回系統' : '⚙️ 總管理員控制台' }}
        </button>
        <button class="btn-logout" @click="handleLogout">登出</button>
      </div>
    </header>

    <AdminDashboard 
      v-if="isAdminView && userProfile?.role === 'super_admin'" 
      @back="isAdminView = false" 
    />

    <router-view 
      v-else 
      @login-success="handleLoginSuccess" 
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from './utils/supabase'
import AdminDashboard from './views/admin/AdminDashboard.vue'

const router = useRouter()
const route = useRoute()

const currentUser = ref(null)
const userProfile = ref(null)
const allGuilds = ref([])
const isAdminView = ref(false)

const getRoleName = (role) => {
  const map = { super_admin: '總管理員', guild_admin: '幫主/統戰', member: '幫眾' }
  return map[role] || '幫眾'
}

const assignedGuildNamesDisplay = computed(() => {
  if (userProfile.value?.role === 'super_admin') return '全部幫會 (總管理員)'
  const guildIds = userProfile.value?.guild_ids || (userProfile.value?.guild_id ? [userProfile.value.guild_id] : [])
  if (guildIds.length === 0) return '尚未綁定幫會'
  
  const names = allGuilds.value
    .filter(g => guildIds.includes(g.id))
    .map(g => g.name)
  return names.length > 0 ? names.join('、') : '尚未綁定幫會'
})

const checkSession = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    currentUser.value = session.user
    await fetchAllGuilds()
    await fetchProfile(session.user.id)
    
    if (route.path === '/login' || route.path === '/' || route.path === '/home') {
      router.push('/members')
    }
  } else {
    currentUser.value = null
    userProfile.value = null
    if (route.path !== '/login') {
      router.push('/login')
    }
  }
}

const fetchAllGuilds = async () => {
  const { data } = await supabase.from('guilds').select('*')
  if (data) allGuilds.value = data
}

const fetchProfile = async (userId) => {
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (data) {
    userProfile.value = data
  }
}

const handleLoginSuccess = async ({ user, profile }) => {
  currentUser.value = user
  userProfile.value = profile
  isAdminView.value = false
  await fetchAllGuilds()
  router.push('/members')
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  currentUser.value = null
  userProfile.value = null
  isAdminView.value = false
  router.push('/login')
}

onMounted(checkSession)
</script>

<style>
#app { min-height: 100vh; background-color: #f4f6f9; }
.global-user-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; background: #1e293b; color: white; font-size: 12px; }
.user-info { display: flex; align-items: center; gap: 12px; }
.user-role-badge { background: #475569; padding: 2px 6px; border-radius: 4px; font-size: 10px; }
.user-role-badge.super_admin { background: #ef4444; }
.user-role-badge.guild_admin { background: #3b82f6; }
.expire-tag { color: #cbd5e1; }
.btn-admin-nav { background: #eab308; color: #1e293b; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-weight: bold; margin-right: 8px; }
.btn-logout { background: #475569; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; }
</style>