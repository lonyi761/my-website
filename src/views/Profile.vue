<template>
  <div :class="['profile-layout', isDarkMode ? 'dark-theme' : 'light-theme']">
    <header class="navbar">
      <nav class="nav-links">
        <router-link to="/home">首頁</router-link>
        <a href="#">成員</a>
        <a href="#">聯賽</a>
        <a href="#">戰備</a>
      </nav>
      
      <div class="user-actions">
        <button class="icon-btn" @click="isDarkMode = !isDarkMode"><i class="mdi mdi-white-balance-sunny"></i></button>
        
        <div class="user-menu" @click="showMenu = !showMenu">
          {{ username }} <i class="mdi mdi-chevron-down"></i>
          <div v-if="showMenu" class="dropdown">
            <router-link to="/profile">個人中心</router-link>
            <a href="#" @click="handleLogout">登出</a>
          </div>
        </div>
      </div>
    </header>

    <main class="main-content">
      <div class="page-header">
        <h2>個人中心</h2>
        <p class="subtitle">管理帳號資訊與登入密碼</p>
      </div>

      <div class="profile-card">
        <div class="tabs">
          <span :class="{ active: activeTab === 'info' }" @click="activeTab = 'info'">個人資訊</span>
          <span :class="{ active: activeTab === 'password' }" @click="activeTab = 'password'">修改密碼</span>
        </div>

        <!-- 頁籤一：個人資訊 -->
        <div v-if="activeTab === 'info'" class="tab-content">
          <div class="info-row">
            <label>VIP 到期時間</label>
            <span>{{ vipExpireFormatted }}</span>
          </div>

          <div class="form-group">
            <label>* 用戶名</label>
            <div class="input-wrapper">
              <input type="text" v-model="username" disabled class="disabled-input" />
            </div>
          </div>

          <div class="form-group">
            <label>* 暱稱</label>
            <div class="input-wrapper">
              <input type="text" v-model="nickname" maxlength="150" />
              <span class="char-count">{{ nickname.length }} / 150</span>
            </div>
          </div>

          <button class="btn-save" @click="handleSaveProfile">儲存</button>
        </div>

        <!-- 頁籤二：修改密碼 -->
        <div v-if="activeTab === 'password'" class="tab-content">
          <div class="form-group">
            <label>* 舊密碼</label>
            <input type="password" v-model="oldPassword" placeholder="請輸入舊密碼" />
          </div>
          <div class="form-group">
            <label>* 新密碼</label>
            <input type="password" v-model="newPassword" placeholder="請輸入新密碼" />
          </div>
          <button class="btn-save" @click="handleSavePassword">修改密碼</button>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isDarkMode = ref(false)
const showMenu = ref(false)
const activeTab = ref('info')

const username = ref('VIP')
const nickname = ref('VIP')
const vipExpire = ref('')
const oldPassword = ref('')
const newPassword = ref('')

const vipExpireFormatted = computed(() => {
  if (!vipExpire.value) return '計算中...'
  const d = new Date(vipExpire.value)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
})

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user) {
    username.value = user.username
    nickname.value = user.nickname || user.username
    vipExpire.value = user.vipExpire
  } else {
    router.push('/login')
  }
})

// 修改暱稱
const handleSaveProfile = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/user/update-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        nickname: nickname.value
      })
    })

    const data = await res.json()
    if (data.success) {
      localStorage.setItem('user', JSON.stringify(data.user))
      alert(data.message)
    } else {
      alert(data.message)
    }
  } catch (error) {
    alert('連線失敗，請檢查後端伺服器！')
  }
}

// 修改密碼
const handleSavePassword = async () => {
  if (!oldPassword.value || !newPassword.value) return alert('請填寫完整密碼！')

  try {
    const res = await fetch('http://localhost:3000/api/user/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        oldPassword: oldPassword.value,
        newPassword: newPassword.value
      })
    })

    const data = await res.json()
    if (data.success) {
      alert(data.message)
      localStorage.removeItem('user')
      router.push('/login')
    } else {
      alert(data.message)
    }
  } catch (error) {
    alert('連線失敗，請檢查後端伺服器！')
  }
}

const handleLogout = () => {
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.profile-layout { min-height: 100vh; transition: all 0.3s; font-family: sans-serif; }
.light-theme { background-color: #f5f7fa; color: #333; }
.light-theme .navbar { background-color: #ffffff; border-bottom: 1px solid #dcdfe6; }
.light-theme .profile-card { background: white; }

.dark-theme { background-color: #1a1e29; color: #d1d5db; }
.dark-theme .navbar { background-color: #242938; border-bottom: 1px solid #333; }
.dark-theme .profile-card { background: #242938; }
.dark-theme input { background: #1a1e29; color: #fff; border-color: #444; }

.navbar { display: flex; justify-content: space-between; align-items: center; padding: 0 40px; height: 55px; }
.nav-links a { margin-right: 30px; text-decoration: none; color: inherit; opacity: 0.7; font-size: 14px; }
.nav-links a.router-link-active { opacity: 1; font-weight: bold; }

.user-actions { display: flex; align-items: center; gap: 15px; }
.icon-btn { background: transparent; border: none; font-size: 20px; cursor: pointer; color: inherit; opacity: 0.7; }
.user-menu { position: relative; cursor: pointer; font-size: 14px; }
.dropdown { position: absolute; top: 35px; right: 0; width: 110px; background: white; border: 1px solid #eee; border-radius: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); display: flex; flex-direction: column; z-index: 100; }
.dropdown a { padding: 8px 12px; text-decoration: none; color: #333; font-size: 13px; }

.main-content { padding: 30px 40px; max-width: 1000px; margin: 0 auto; }
.page-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.subtitle { color: #888; font-size: 12px; margin-top: 4px; }

.profile-card { margin-top: 20px; padding: 25px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
.tabs { display: flex; gap: 30px; border-bottom: 1px solid #eee; padding-bottom: 10px; margin-bottom: 25px; }
.tabs span { cursor: pointer; color: #666; font-size: 14px; position: relative; }
.tabs span.active { color: #409eff; font-weight: bold; }
.tabs span.active::after { content: ''; position: absolute; bottom: -11px; left: 0; right: 0; height: 2px; background: #409eff; }

.tab-content { max-width: 400px; }
.info-row { margin-bottom: 20px; font-size: 14px; }
.info-row label { color: #666; margin-right: 20px; }

.form-group { margin-bottom: 20px; }
.form-group label { display: block; font-size: 13px; margin-bottom: 8px; color: #555; }
.input-wrapper { position: relative; }
.input-wrapper input, .form-group input { width: 100%; padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; box-sizing: border-box; }
.disabled-input { background-color: #f5f7fa; cursor: not-allowed; color: #909399; }
.char-count { position: absolute; right: 10px; top: 8px; font-size: 12px; color: #aaa; }

.btn-save { background: #409eff; color: white; border: none; padding: 8px 22px; border-radius: 4px; cursor: pointer; font-size: 14px; }
.btn-save:hover { background: #66b1ff; }
</style>