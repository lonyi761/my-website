<template>
  <header class="navbar">
    <div class="nav-left">
      <span class="brand-logo">行優測試</span>
    </div>

    <nav class="nav-center">
      <router-link to="/home" :class="{ active: activeNav === 'home' }">首頁</router-link>
      <router-link to="/members" :class="{ active: activeNav === 'members' }">成員</router-link>
      <router-link to="/league" :class="{ active: activeNav === 'league' }">聯賽</router-link>
      <router-link to="/preparation" :class="{ active: activeNav === 'preparation' }">戰備</router-link>
    </nav>
    
    <div class="nav-right">
      <button class="icon-btn" @click="$emit('toggle-theme')" title="切換深淺色">
        <i :class="['mdi', isDarkMode ? 'mdi-weather-night' : 'mdi-white-balance-sunny']"></i>
      </button>
      
      <div class="user-dropdown" @click.stop="showMenu = !showMenu">
        <span>{{ username }}</span>
        <i class="mdi mdi-chevron-down"></i>
        <div v-if="showMenu" class="dropdown-menu">
          <router-link to="/profile">個人中心</router-link>
          <a href="#" @click.prevent="handleLogout">登出</a>
        </div>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

defineProps({
  activeNav: { type: String, default: 'home' },
  isDarkMode: { type: Boolean, default: false },
  username: { type: String, default: 'VIP' }
})

defineEmits(['toggle-theme'])

const router = useRouter()
const showMenu = ref(false)

const handleLogout = () => {
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.navbar { height: 55px; padding: 0 30px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.brand-logo { font-size: 16px; font-weight: bold; }
.nav-center a { margin: 0 15px; text-decoration: none; color: inherit; opacity: 0.7; font-size: 14px; }
.nav-center a.active { opacity: 1; font-weight: 600; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
.nav-right { display: flex; align-items: center; gap: 15px; }
.icon-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; }
.user-dropdown { position: relative; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px; }
.dropdown-menu { position: absolute; right: 0; top: 30px; background: white; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 110px; display: flex; flex-direction: column; z-index: 50; }
.dropdown-menu a { padding: 8px 12px; text-decoration: none; color: #333; font-size: 13px; }
</style>