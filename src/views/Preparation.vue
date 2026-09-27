<template>
  <div :class="['prep-layout', isDarkMode ? 'dark-theme' : 'light-theme']">
    <!-- 1. 頂部導航列 -->
    <header class="navbar">
      <div class="nav-left">
        <span class="brand-logo">行優測試</span>
      </div>

      <nav class="nav-center">
        <router-link to="/home">首頁</router-link>
        <router-link to="/members">成員</router-link>
        <a href="#">聯賽</a>
        <router-link to="/preparation" class="active">戰備</router-link>
      </nav>
      
      <div class="nav-right">
        <button class="icon-btn" @click="isDarkMode = !isDarkMode" title="切換深淺色">
          <i :class="['mdi', isDarkMode ? 'mdi-weather-night' : 'mdi-white-balance-sunny']"></i>
        </button>
        
        <div class="user-dropdown" @click.stop="showMenu = !showMenu">
          <span>{{ username }}</span>
          <i class="mdi mdi-chevron-down"></i>
          <div v-if="showMenu" class="dropdown-menu">
            <router-link to="/profile">個人中心</router-link>
            <a href="#" @click="handleLogout">登出</a>
          </div>
        </div>
      </div>
    </header>

    <!-- 2. 主要內容區 (左側選單 + 右側職能管理) -->
    <div class="prep-main">
      <!-- 左側選單 -->
      <aside class="prep-sidebar">
        <ul class="sidebar-menu">
          <li :class="{ active: currentTab === 'roles' }" @click="currentTab = 'roles'">職能管理</li>
          <li :class="{ active: currentTab === 'equip' }" @click="currentTab = 'equip'">配裝管理</li>
          <li :class="{ active: currentTab === 'template' }" @click="currentTab = 'template'">排表模板</li>
          <li :class="{ active: currentTab === 'recruit' }" @click="currentTab = 'recruit'">廣場招募</li>
          <li :class="{ active: currentTab === 'faq' }" @click="currentTab = 'faq'">報名問題</li>
          <li :class="{ active: currentTab === 'points' }" @click="currentTab = 'points'">積分</li>
        </ul>
      </aside>

      <!-- 右側：職能管理內容 -->
      <main class="content-area">
        <div class="prep-header">
          <h2>職能管理</h2>
          <p class="sub-notice">
            個人職能、團隊職能、小隊職能三類維護流派列表，互不干擾。個人職能用於幫會成員角色卡片「戰備偏好」及排表卡片多選；團隊/小隊職能提供在排表中標註團隊與小隊職重（與成員表獨立），切換頁面後列表與排序將自動獨立，拖動下開可保存當前頁面內的順序。
          </p>
        </div>

        <!-- 功能列：子分頁與操作按鈕 -->
        <div class="toolbar">
          <div class="sub-tabs">
            <button 
              :class="['sub-tab-btn', { active: roleCategory === 'personal' }]" 
              @click="roleCategory = 'personal'"
            >
              個人職能
            </button>
            <button 
              :class="['sub-tab-btn', { active: roleCategory === 'squad' }]" 
              @click="roleCategory = 'squad'"
            >
              小隊職能
            </button>
          </div>

          <div class="right-actions">
            <button class="btn-primary" @click="openRoleModal()">+ 新增職能類型</button>
            <button class="btn-secondary margin-l" @click="importTemplate">導入通用模板</button>
          </div>
        </div>

        <!-- 職能表格 -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th width="60">#</th>
                <th>職能名稱</th>
                <th>描述</th>
                <th>職能身份</th>
                <th>排表標籤</th>
                <th width="90">標籤開關</th>
                <th width="100">隱藏職業名</th>
                <th width="90">職能邊框</th>
                <th width="90">排序值</th>
                <th width="110">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(role, index) in roleList" :key="role.id">
                <td class="drag-cell">
                  <span class="drag-icon">⊹</span>
                  <span>{{ index + 1 }}</span>
                </td>
                <td class="font-bold">{{ role.name }}</td>
                <td>{{ role.desc || '—' }}</td>
                <td>{{ role.identity || '—' }}</td>
                <td>{{ role.tag || '—' }}</td>
                
                <!-- 開關列 -->
                <td>
                  <label class="switch">
                    <input type="checkbox" v-model="role.tagSwitch" />
                    <span class="slider"></span>
                  </label>
                </td>
                <td>
                  <label class="switch">
                    <input type="checkbox" v-model="role.hideEquip" />
                    <span class="slider"></span>
                  </label>
                </td>
                <td>
                  <label class="switch">
                    <input type="checkbox" v-model="role.borderSwitch" />
                    <span class="slider"></span>
                  </label>
                </td>

                <!-- 排序值 -->
                <td>
                  <input type="number" v-model.number="role.sortOrder" class="sort-input" />
                </td>

                <!-- 操作 -->
                <td>
                  <button class="btn-link" @click="openRoleModal(role)">編輯</button>
                  <button class="btn-link text-red margin-l" @click="deleteRole(role.id)">刪除</button>
                </td>
              </tr>
              <tr v-if="roleList.length === 0">
                <td :colspan="10" class="empty-cell">暫無職能資料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- 新增 / 編輯職能彈窗 -->
    <div v-if="showRoleModal" class="modal-overlay" @click.self="showRoleModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>{{ editingRoleId ? '編輯職能' : '新增職能' }}</h3>
          <span class="close-btn" @click="showRoleModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label><span class="req">*</span>職能名稱：</label>
            <input type="text" v-model="roleForm.name" placeholder="請輸入職能名稱" />
          </div>
          <div class="form-row">
            <label>描述：</label>
            <input type="text" v-model="roleForm.desc" placeholder="請輸入描述資訊" />
          </div>
          <div class="form-row">
            <label>職能身份：</label>
            <input type="text" v-model="roleForm.identity" placeholder="—" />
          </div>
          <div class="form-row">
            <label>排表標籤：</label>
            <input type="text" v-model="roleForm.tag" placeholder="—" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showRoleModal = false">取消</button>
          <button class="btn-primary" @click="saveRole">確定</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isDarkMode = ref(false)
const showMenu = ref(false)
const username = ref('VIP')

const currentTab = ref('roles')
const roleCategory = ref('personal')

// 17 項抓取並經繁體校正的預設職能資料
const roleList = ref([
  { id: 1, name: 'D潮拆塔', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 2, name: '保鏢拆', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 3, name: '埋頭猛拆', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 4, name: '塔仇主T', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 5, name: '增益絕', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 6, name: '奶絕', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 7, name: '指揮', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 8, name: '清泉人傷', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 9, name: '清泉保活', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 10, name: '灌大團', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 11, name: '點殺', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 12, name: '燒屍體', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 13, name: '破甲人傷', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 14, name: '純保鏢', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 15, name: '統戰', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 16, name: '騰龍保鏢', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 },
  { id: 17, name: '騰龍合軸', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 0 }
])

// 彈窗與表單
const showRoleModal = ref(false)
const editingRoleId = ref(null)
const roleForm = ref({ name: '', desc: '', identity: '', tag: '' })

const openRoleModal = (role = null) => {
  if (role) {
    editingRoleId.value = role.id
    roleForm.value = { ...role }
  } else {
    editingRoleId.value = null
    roleForm.value = { name: '', desc: '', identity: '', tag: '' }
  }
  showRoleModal.value = true
}

const saveRole = () => {
  if (!roleForm.value.name.trim()) return alert('請輸入職能名稱！')

  if (editingRoleId.value) {
    const idx = roleList.value.findIndex(r => r.id === editingRoleId.value)
    if (idx > -1) roleList.value[idx] = { ...roleList.value[idx], ...roleForm.value }
  } else {
    roleList.value.push({
      id: Date.now(),
      ...roleForm.value,
      tagSwitch: false,
      hideEquip: false,
      borderSwitch: false,
      sortOrder: 0
    })
  }
  showRoleModal.value = false
}

const deleteRole = (id) => {
  if (confirm('確定要刪除該職能嗎？')) {
    roleList.value = roleList.value.filter(r => r.id !== id)
  }
}

const importTemplate = () => {
  alert('成功匯入通用模板職能！')
}

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user) {
    username.value = user.username
  } else {
    router.push('/login')
  }
})

const handleLogout = () => {
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.prep-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.light-theme { background-color: #f4f6f9; color: #2c3e50; }
.light-theme .navbar { background: #ffffff; border-bottom: 1px solid #e2e8f0; }
.dark-theme { background-color: #121824; color: #e2e8f0; }
.dark-theme .navbar { background: #1e2638; border-bottom: 1px solid #2d3748; }

.navbar { height: 55px; padding: 0 30px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.nav-left { display: flex; align-items: center; }
.brand-logo { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
.nav-center a { margin: 0 15px; text-decoration: none; color: inherit; opacity: 0.7; font-size: 14px; }
.nav-center a.active { opacity: 1; font-weight: 600; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
.nav-right { display: flex; align-items: center; gap: 15px; }
.icon-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; }
.user-dropdown { position: relative; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px; }
.dropdown-menu { position: absolute; right: 0; top: 30px; background: white; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 110px; display: flex; flex-direction: column; z-index: 50; }
.dropdown-menu a { padding: 8px 12px; text-decoration: none; color: #333; font-size: 13px; }

/* 內容版面 */
.prep-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }

/* 左側選單 */
.prep-sidebar { width: 180px; background: #ffffff; border-radius: 8px; padding: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-menu { list-style: none; padding: 0; margin: 0; }
.sidebar-menu li { padding: 12px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 4px; color: #64748b; transition: all 0.2s; }
.sidebar-menu li.active, .sidebar-menu li:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.prep-header h2 { margin: 0 0 8px 0; font-size: 16px; }
.sub-notice { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #3b82f6; }

/* 工具列 */
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sub-tabs { display: flex; gap: 15px; border-bottom: 1px solid #e2e8f0; }
.sub-tab-btn { background: none; border: none; padding: 8px 4px; font-size: 13px; cursor: pointer; color: #64748b; position: relative; }
.sub-tab-btn.active { color: #2563eb; font-weight: bold; }
.sub-tab-btn.active::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: #2563eb; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }

/* 表格與開關 */
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }
.drag-cell { display: flex; align-items: center; gap: 8px; color: #94a3b8; }
.drag-icon { cursor: grab; font-weight: bold; }
.sort-input { width: 50px; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; text-align: center; font-size: 12px; }

/* Toggle 開關樣式 */
.switch { position: relative; display: inline-block; width: 34px; height: 18px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 18px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(16px); }

/* 彈窗 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.small-card { width: 380px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row label { width: 90px; font-weight: bold; }
.form-row input { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
.req { color: #ef4444; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }
</style>