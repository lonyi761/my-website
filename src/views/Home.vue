<template>
  <div :class="['home-layout', isDarkMode ? 'dark-theme' : 'light-theme']">
    <header class="navbar">
      <div class="nav-left">
        <span class="brand-logo">行優測試</span>
      </div>

      <nav class="nav-center">
  <router-link to="/home">首頁</router-link>
  <router-link to="/members">成員</router-link>
  <a href="#">聯賽</a>
  <a href="#">戰備</a>
</nav>
      
      <div class="nav-right">
        <button class="icon-btn" @click="isDarkMode = !isDarkMode" title="切換深淺色">
          <i :class="['mdi', isDarkMode ? 'mdi-weather-night' : 'mdi-white-balance-sunny']"></i>
        </button>
        
        <div class="user-dropdown" @click="showMenu = !showMenu">
          <span>{{ username }}</span>
          <i class="mdi mdi-chevron-down"></i>
          <div v-if="showMenu" class="dropdown-menu">
            <a href="#">系統日誌</a>
            <a href="#">系統配置</a>
            <router-link to="/profile">個人中心</router-link>
            <a href="#" @click="handleLogout">登出</a>
          </div>
        </div>
      </div>
    </header>

    <main class="main-container">
      <section class="section-block">
        <div class="block-tag">今日工作</div>
        <div class="card white-card">
          <div class="card-top-row">
            <div class="user-info-title">
              <h2>{{ username }}，開始處理今天的事項</h2>
              <span class="vip-tag">{{ vipRemainingText }}</span>
            </div>
            <button class="btn-notice" @click="openNoticeModal()">系統公告</button>
          </div>
          <p class="sub-text">行優測試平台</p>

          <div class="reminder-box" @click="openNoticeModal(latestAnnouncement)" style="cursor: pointer;">
            <div class="rem-label">最新提醒</div>
            <div class="rem-title">{{ latestAnnouncement.title }}</div>
            <div class="rem-sub">{{ latestAnnouncement.type }} ({{ latestAnnouncement.date }})</div>
          </div>
        </div>
      </section>
    </main>

    <footer class="footer-bar">
      <span>行優測試系統</span>
      <span>技術支持</span>
    </footer>

    <!-- 系統公告彈窗 -->
    <div v-if="showNoticeModal" class="modal-overlay" @click.self="closeNoticeModal">
      <div class="modal-card">
        
        <!-- 頂部頁籤/標題列 (對應圖一與圖二頂部) -->
        <div class="modal-header">
          <div v-if="selectedNotice" class="back-link" @click="selectedNotice = null">
            <i class="mdi mdi-chevron-left"></i> 返回列表
          </div>
          <h3 v-else>系統公告 <span class="count">共 {{ announcements.length }} 條</span></h3>
          <span class="close-btn" @click="closeNoticeModal">&times;</span>
        </div>

        <!-- 視圖一：公告列表頁 -->
        <div v-if="!selectedNotice">
          <!-- 管理員發布區域 -->
          <div v-if="role === 'admin'" class="admin-publish-box">
            <h4>發布新公告 (管理員專用)</h4>
            <div class="publish-form">
              <div class="row-inputs">
                <select v-model="newNoticeType">
                  <option value="系統公告">系統公告</option>
                  <option value="更新公告">更新公告</option>
                </select>
                <input type="text" v-model="newNoticeTitle" placeholder="請輸入公告標題..." />
              </div>
              <textarea v-model="newNoticeContent" rows="4" placeholder="請輸入詳細內文 (支援換行與項目點)..."></textarea>
              <button class="btn-publish" @click="handlePublish">發布公告</button>
            </div>
          </div>

          <!-- 公告列表 (對應圖一) -->
          <div class="modal-body">
            <div 
              v-for="item in announcements" 
              :key="item.id" 
              class="notice-item-card"
              @click="selectedNotice = item"
            >
              <span :class="['type-tag', item.type === '更新公告' ? 'green' : 'gray']">{{ item.type }}</span>
              <span class="item-title">{{ item.title }}</span>
              <span class="item-date">{{ item.date }}</span>
            </div>
          </div>
        </div>

        <!-- 視圖二：公告詳情頁 (對應圖二) -->
        <div v-else class="notice-detail-view">
          <div class="detail-header-card">
            <span :class="['type-tag', selectedNotice.type === '更新公告' ? 'green' : 'gray']">{{ selectedNotice.type }}</span>
            <span class="detail-title">{{ selectedNotice.title }}</span>
            <span class="detail-date">{{ selectedNotice.date }}</span>
          </div>

          <div class="detail-content-box">
            <div class="content-text">{{ selectedNotice.content }}</div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isDarkMode = ref(false)
const showMenu = ref(false)
const showNoticeModal = ref(false)
const selectedNotice = ref(null) // 存放當前點開的公告

const username = ref('VIP')
const role = ref('user')
const vipRemainingText = ref('計算中...')
let timer = null

const announcements = ref([])
const newNoticeType = ref('系統公告')
const newNoticeTitle = ref('')
const newNoticeContent = ref('')

const latestAnnouncement = computed(() => {
  if (announcements.value.length > 0) return announcements.value[0]
  return { title: '暫無公告', type: '系統公告', date: '' }
})

const openNoticeModal = (targetNotice = null) => {
  selectedNotice.value = targetNotice
  showNoticeModal.value = true
}

const closeNoticeModal = () => {
  showNoticeModal.value = false
  selectedNotice.value = null
}

const fetchAnnouncements = async () => {
  try {
    const res = await fetch('[https://my-website-backend-v04t.onrender.com](https://my-website-backend-v04t.onrender.com)/api/announcements')
    const data = await res.json()
    if (data.success) {
      announcements.value = data.announcements
    }
  } catch (error) {
    console.error('無法取得公告數據')
  }
}

const handlePublish = async () => {
  if (!newNoticeTitle.value || !newNoticeContent.value) return alert('請填寫完整標題與內文')

  try {
    const res = await fetch('[https://my-website-backend-v04t.onrender.com](https://my-website-backend-v04t.onrender.com)/api/announcements', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        type: newNoticeType.value,
        title: newNoticeTitle.value,
        content: newNoticeContent.value
      })
    })

    const data = await res.json()
    if (data.success) {
      alert(data.message)
      announcements.value = data.announcements
      newNoticeTitle.value = ''
      newNoticeContent.value = ''
    } else {
      alert(data.message)
    }
  } catch (error) {
    alert('發布失敗，請確認伺服器連線')
  }
}

const startVipCountdown = (expireIso) => {
  if (!expireIso) return
  const expireTime = new Date(expireIso).getTime()

  const update = () => {
    const now = new Date().getTime()
    const diff = expireTime - now

    if (diff <= 0) {
      vipRemainingText.value = 'VIP 試用已到期'
      return
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    const seconds = Math.floor((diff % (1000 * 60)) / 1000)

    vipRemainingText.value = `VIP 剩餘 ${days}天${hours}小時${minutes}分${seconds}秒`
  }

  update()
  timer = setInterval(update, 1000)
}

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user) {
    username.value = user.username
    role.value = user.role || 'user'
    startVipCountdown(user.vipExpire)
    fetchAnnouncements()
  } else {
    router.push('/login')
  }
})

onUnmounted(() => {
  if (timer) clearInterval(timer)
})

const handleLogout = () => {
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.home-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; transition: background-color 0.3s, color 0.3s; }
.light-theme { background-color: #eef2f7; color: #2c3e50; }
.light-theme .navbar { background: #ffffff; border-bottom: 1px solid #e2e8f0; }
.light-theme .white-card { background: #ffffff; }
.dark-theme { background-color: #121824; color: #e2e8f0; }
.dark-theme .navbar { background: #1e2638; border-bottom: 1px solid #2d3748; }
.dark-theme .white-card { background: #1e2638; }

.navbar { height: 55px; padding: 0 30px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.nav-left { display: flex; align-items: center; gap: 10px; }
.brand-logo { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
.nav-center a { margin: 0 15px; text-decoration: none; color: inherit; opacity: 0.7; font-size: 14px; }
.nav-center a.active { opacity: 1; font-weight: 600; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
.nav-right { display: flex; align-items: center; gap: 15px; }
.icon-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; opacity: 0.8; }
.user-dropdown { position: relative; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px; }
.dropdown-menu { position: absolute; right: 0; top: 30px; background: white; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 110px; display: flex; flex-direction: column; z-index: 50; overflow: hidden; }
.dropdown-menu a { padding: 8px 12px; text-decoration: none; color: #333; font-size: 13px; }

.main-container { flex: 1; max-width: 1000px; width: 100%; margin: 30px auto; padding: 0 20px; box-sizing: border-box; }
.section-block { margin-bottom: 20px; }
.block-tag { font-size: 12px; color: #3b82f6; font-weight: bold; margin-bottom: 8px; }
.white-card { padding: 25px 30px; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.03); }
.card-top-row { display: flex; justify-content: space-between; align-items: center; }
.user-info-title { display: flex; align-items: center; gap: 12px; }
.user-info-title h2 { margin: 0; font-size: 18px; }
.vip-tag { background: #dcfce7; color: #16a34a; font-size: 11px; padding: 3px 8px; border-radius: 12px; }
.btn-notice { border: 1px solid #cbd5e1; background: #f8fafc; padding: 5px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; }
.sub-text { font-size: 12px; color: #94a3b8; margin: 6px 0 20px 0; }
.reminder-box { background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #f1f5f9; }
.rem-label { font-size: 11px; color: #3b82f6; font-weight: bold; }
.rem-title { font-size: 14px; font-weight: 600; margin: 6px 0 4px 0; }
.rem-sub { font-size: 11px; color: #94a3b8; }
.footer-bar { display: flex; justify-content: space-between; padding: 15px 30px; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }

/* 彈窗樣式 (完全還原圖一與圖二) */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: #f0f2f5; width: 550px; border-radius: 12px; padding: 20px; color: #333; max-height: 85vh; overflow-y: auto; box-shadow: 0 8px 30px rgba(0,0,0,0.15); }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.modal-header h3 { margin: 0; font-size: 16px; color: #1e293b; }
.back-link { cursor: pointer; color: #475569; font-size: 13px; font-weight: 600; display: flex; align-items: center; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }

/* 列表卡片 (圖一風格) */
.notice-item-card {
  background: white;
  border-radius: 8px;
  padding: 12px 15px;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0,0,0,0.03);
  transition: transform 0.1s;
}
.notice-item-card:hover { transform: translateY(-1px); }
.item-title { flex: 1; margin: 0 12px; font-size: 13px; font-weight: 500; color: #334155; }
.item-date { font-size: 12px; color: #94a3b8; }

/* 詳情頁 (圖二風格) */
.detail-header-card {
  background: white;
  border-radius: 8px;
  padding: 12px 15px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.detail-title { flex: 1; margin: 0 12px; font-size: 14px; font-weight: bold; color: #1e293b; }
.detail-date { font-size: 12px; color: #94a3b8; }

.detail-content-box {
  background: white;
  border-radius: 8px;
  padding: 20px;
  min-height: 200px;
}
.content-text {
  font-size: 13px;
  line-height: 1.7;
  color: #475569;
  white-space: pre-wrap; /* 保持項目點與換行 */
}

/* 管理員發布框 */
.admin-publish-box { background: #ffffff; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
.admin-publish-box h4 { margin: 0 0 10px 0; font-size: 13px; color: #1e293b; }
.publish-form { display: flex; flex-direction: column; gap: 8px; }
.row-inputs { display: flex; gap: 8px; }
.row-inputs select { padding: 6px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 12px; }
.row-inputs input { flex: 1; padding: 6px 10px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 12px; }
.publish-form textarea { width: 100%; padding: 8px 10px; border-radius: 4px; border: 1px solid #cbd5e1; font-size: 12px; resize: vertical; box-sizing: border-box; }
.btn-publish { background: #3b82f6; color: white; border: none; padding: 8px; border-radius: 4px; cursor: pointer; font-size: 12px; font-weight: bold; }
</style>