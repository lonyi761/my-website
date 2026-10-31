<template>
  <div id="app">
    <!-- 帳號資訊、控制台入口與登出已整合到各頁頂部的 Navbar（透過 provide 提供） -->
    <AdminDashboard 
      v-if="isAdminView && userProfile?.role === 'super_admin'" 
      @back="isAdminView = false" 
    />

    <router-view
      v-else
      @login-success="handleLoginSuccess"
    />

    <!-- 全站頁面內提示（取代 alert 跳窗） -->
    <NoticeHost />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, provide } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { supabase } from './utils/supabase'
import AdminDashboard from './views/admin/AdminDashboard.vue'
import NoticeHost from './components/NoticeHost.vue'
import { safeRedirect } from './router'
import { getAccountBlockReason } from './utils/accountStatus'

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

// 停權、到期或帳號已刪除時強制登出（資料庫也會拒絕讀取，這裡負責顯示原因）
const signOutBlocked = async (reason) => {
  await supabase.auth.signOut()
  currentUser.value = null
  userProfile.value = null
  isAdminView.value = false
  router.push({ path: '/login', query: { reason } })
}

const checkSession = async () => {
  // 等初始路由解析完成，否則 route.path 仍是 '/'，會誤導向並遺失網址參數
  await router.isReady()
  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    currentUser.value = session.user
    const profileError = await fetchProfile(session.user.id)
    // 讀取失敗（例如網路問題）時不登出，避免誤判
    const blockReason = profileError ? null : getAccountBlockReason(userProfile.value)
    if (blockReason) return signOutBlocked(blockReason)
    await fetchAllGuilds()

    if (route.path === '/login' || route.path === '/' || route.path === '/home') {
      router.push(safeRedirect(route.query.redirect))
    }
  } else {
    // 沒登入時路由守衛（router.js）已導到登入頁
    currentUser.value = null
    userProfile.value = null
  }
}

const fetchAllGuilds = async () => {
  const { data } = await supabase.from('guilds').select('*')
  if (data) allGuilds.value = data
}

const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()

  if (!error) userProfile.value = data
  return error
}

const handleLoginSuccess = async ({ user, profile }) => {
  currentUser.value = user
  userProfile.value = profile
  isAdminView.value = false
  await fetchAllGuilds()
  router.push(safeRedirect(route.query.redirect))
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  currentUser.value = null
  userProfile.value = null
  isAdminView.value = false
  router.push('/login')
}

// 提供給 Navbar：同一條頂部列顯示帳號、角色、授權幫會、到期日、控制台入口與登出
provide('account', {
  profile: userProfile,
  guildNames: assignedGuildNamesDisplay,
  roleName: computed(() => getRoleName(userProfile.value?.role)),
  openAdminView: () => { isAdminView.value = true },
  logout: handleLogout
})

onMounted(checkSession)
</script>

<style>
#app { min-height: 100vh; background-color: var(--c-page); }
</style>