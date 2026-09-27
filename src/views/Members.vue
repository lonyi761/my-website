<template>
  <div :class="['members-layout', isDarkMode ? 'dark-theme' : 'light-theme']">
    <!-- 1. 頂部導航列 (與 Home.vue 一致) -->
    <header class="navbar">
      <div class="nav-left">
        <span class="brand-logo">行優測試</span>
      </div>

      <nav class="nav-center">
        <router-link to="/home">首頁</router-link>
        <router-link to="/members" class="active">成員</router-link>
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
            <router-link to="/profile">個人中心</router-link>
            <a href="#" @click="handleLogout">登出</a>
          </div>
        </div>
      </div>
    </header>

    <!-- 2. 主要內容區 (左側幫會 + 右側列表) -->
    <div class="members-main">
      <!-- 左側：幫會分組 -->
      <aside class="guild-sidebar">
        <div class="sidebar-header">
          <h3>幫會</h3>
          <button class="btn-add-guild" @click="openAddGuildModal">+ 新增幫會</button>
        </div>
        <ul class="guild-list">
          <li 
            v-for="guild in guildList" 
            :key="guild.id" 
            :class="{ active: currentGuildId === guild.id }"
            @click="currentGuildId = guild.id"
          >
            <span>{{ guild.name }}</span>
            <span class="guild-count">{{ getGuildMemberCount(guild.name) }} 人</span>
          </li>
        </ul>
      </aside>

      <!-- 右側：成員資料表格 -->
      <main class="content-area">
        <!-- 頂部操作與篩選工具列 -->
        <div class="toolbar">
          <div class="left-actions">
            <input type="text" v-model="searchQuery" placeholder="搜尋角色名..." class="search-input" />
            <button class="btn-primary" @click="openMemberModal()">新增成員</button>
            <button class="btn-secondary" @click="showImportModal = true">截圖導入</button>
            <button class="btn-secondary" @click="showBatchModal = true" :disabled="selectedMemberIds.length === 0">
              批量操作 {{ selectedMemberIds.length > 0 ? `(${selectedMemberIds.length})` : '' }}
            </button>
          </div>

          <div class="right-actions">
            <!-- 右上角齒輪：表格列設置 -->
            <button class="btn-icon" @click="showColumnModal = true" title="表格列設置">
              <i class="mdi mdi-cog-outline"></i>
            </button>
          </div>
        </div>

        <!-- 成員表格 -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" /></th>
                <th width="60">序號</th>
                <th>角色名</th>
                <th v-if="columns.school">流派</th>
                <th v-if="columns.status">幫眾狀態</th>
                <th v-if="columns.godlyWeapon">神兵</th>
                <th v-if="columns.attendance">出勤</th>
                <th v-if="columns.leave">請假</th>
                <th v-if="columns.rolePref">職能偏好</th>
                <th v-if="columns.notes">成員備註</th>
                <th v-if="columns.contact">聯繫方式</th>
                <th width="100">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(member, index) in filteredMembers" :key="member.id">
                <td><input type="checkbox" :value="member.id" v-model="selectedMemberIds" /></td>
                <td>{{ index + 1 }}</td>
                <td class="font-bold">{{ member.name }}</td>
                <td v-if="columns.school">
                  <span class="school-tag">{{ member.currentSchool || '未設置' }}</span>
                </td>
                <td v-if="columns.status">
                  <span :class="['status-badge', getStatusClass(member.status)]">{{ member.status }}</span>
                </td>
                <td v-if="columns.godlyWeapon">{{ member.hasGodlyWeapon ? '有' : '—' }}</td>
                <td v-if="columns.attendance">{{ member.attendance || 0 }}</td>
                <td v-if="columns.leave">{{ member.leave || 0 }}</td>
                <td v-if="columns.rolePref">{{ member.rolePref || '未設置' }}</td>
                <td v-if="columns.notes">{{ member.notes || '—' }}</td>
                <td v-if="columns.contact">{{ member.contact || '—' }}</td>
                <td>
                  <button class="btn-link" @click="openMemberModal(member)">編輯</button>
                  <button class="btn-link text-red" @click="deleteMember(member.id)">刪除</button>
                </td>
              </tr>
              <tr v-if="filteredMembers.length === 0">
                <td :colspan="12" class="empty-cell">暫無成員資料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- 3. 彈窗區塊 -->

    <!-- 表格列設置彈窗 -->
    <div v-if="showColumnModal" class="modal-overlay" @click.self="showColumnModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>表格列設置</h3>
          <span class="close-btn" @click="showColumnModal = false">&times;</span>
        </div>
        <div class="modal-body checkbox-grid">
          <label><input type="checkbox" v-model="columns.school" /> 流派</label>
          <label><input type="checkbox" v-model="columns.status" /> 幫眾狀態</label>
          <label><input type="checkbox" v-model="columns.godlyWeapon" /> 神兵</label>
          <label><input type="checkbox" v-model="columns.attendance" /> 出勤</label>
          <label><input type="checkbox" v-model="columns.leave" /> 請假</label>
          <label><input type="checkbox" v-model="columns.rolePref" /> 職能偏好</label>
          <label><input type="checkbox" v-model="columns.notes" /> 成員備註</label>
          <label><input type="checkbox" v-model="columns.contact" /> 聯繫方式</label>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="showColumnModal = false">確定</button>
        </div>
      </div>
    </div>

    <!-- 新增 / 編輯成員彈窗 (完全還原要求) -->
    <div v-if="showMemberModal" class="modal-overlay" @click.self="showMemberModal = false">
      <div class="modal-card large-card">
        <div class="modal-header">
          <h3>{{ editingMemberId ? '編輯成員' : '新增成員' }}</h3>
          <span class="close-btn" @click="showMemberModal = false">&times;</span>
        </div>
        <div class="modal-body form-grid">
          <!-- 基礎資訊 -->
          <div class="form-section">
            <h4 class="section-title">基礎資訊</h4>
            
            <div class="form-row">
              <label><span class="req">*</span>角色名：</label>
              <input type="text" v-model="memberForm.name" placeholder="請輸入角色名" />
              <button class="btn-link margin-l" @click="showFormerNamesModal = true">
                曾用名 ({{ memberForm.formerNames.length }})
              </button>
            </div>

            <div class="form-row">
              <label><span class="req">*</span>流派列表 (最多選2個)：</label>
              <div class="school-selector">
                <button 
                  v-for="s in availableSchools" 
                  :key="s" 
                  :class="['school-btn', { active: memberForm.schools.includes(s) }]"
                  @click="toggleSchoolSelection(s)"
                >
                  {{ s }}
                </button>
              </div>
            </div>

            <div class="form-row" v-if="memberForm.schools.length > 0">
              <label><span class="req">*</span>當前流派：</label>
              <select v-model="memberForm.currentSchool">
                <option v-for="s in memberForm.schools" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div class="form-row">
              <label>神兵：</label>
              <input type="checkbox" v-model="memberForm.hasGodlyWeapon" />
            </div>

            <div class="form-row">
              <label>所屬幫會：</label>
              <select v-model="memberForm.guild">
                <option v-for="g in guildList" :key="g.id" :value="g.name">{{ g.name }}</option>
              </select>

              <label class="margin-l">幫眾狀態：</label>
              <select v-model="memberForm.status">
                <option value="幫眾">幫眾</option>
                <option value="學徒">學徒</option>
                <option value="退幫">退幫</option>
              </select>
            </div>

            <div class="form-row">
              <label>聯繫方式：</label>
              <input type="text" v-model="memberForm.contact" placeholder="DC名稱" />
            </div>

            <div class="form-row">
              <label>成員備註：</label>
              <input type="text" v-model="memberForm.notes" placeholder="請輸入備註" />
            </div>

            <div class="form-row">
              <label>一線牽：</label>
              <input type="text" v-model="memberForm.tether" placeholder="輸入角色名搜尋" />
            </div>

            <div class="form-row">
              <label>職能偏好：</label>
              <input type="text" v-model="memberForm.rolePref" placeholder="未設置 (從戰備頁面連動)" disabled />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showMemberModal = false">取消</button>
          <button class="btn-primary" @click="saveMember">提交</button>
        </div>
      </div>
    </div>

    <!-- 曾用名彈窗 -->
    <div v-if="showFormerNamesModal" class="modal-overlay" @click.self="showFormerNamesModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>編輯曾用名</h3>
          <span class="close-btn" @click="showFormerNamesModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div v-for="(name, idx) in memberForm.formerNames" :key="idx" class="former-name-item">
            <input type="text" v-model="memberForm.formerNames[idx]" />
            <button class="btn-link text-red" @click="memberForm.formerNames.splice(idx, 1)">刪除</button>
          </div>
          <button class="btn-secondary full-width margin-t" @click="memberForm.formerNames.push('')">+ 新增歷史曾用名</button>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="showFormerNamesModal = false">確定</button>
        </div>
      </div>
    </div>

    <!-- 截圖導入彈窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="showImportModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>截圖導入</h3>
          <span class="close-btn" @click="showImportModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>導入到幫會：</label>
            <select v-model="importTargetGuild">
              <option v-for="g in guildList" :key="g.id" :value="g.name">{{ g.name }}</option>
            </select>
          </div>

          <div class="upload-box" @click="triggerFileUpload">
            <i class="mdi mdi-cloud-upload-outline upload-icon"></i>
            <p>點擊上傳幫會成員列表截圖（支援 JPG / PNG）</p>
            <input type="file" ref="fileInput" @change="handleScreenshotUpload" accept="image/*" hidden />
          </div>

          <div v-if="ocrPreviewList.length > 0" class="ocr-result-box">
            <h4>識別結果預覽 (共 {{ ocrPreviewList.length }} 人)：</h4>
            <ul>
              <li v-for="(item, idx) in ocrPreviewList" :key="idx">
                {{ item.name }} — 流派：{{ item.school }}
              </li>
            </ul>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showImportModal = false">取消</button>
          <button class="btn-primary" @click="confirmImport" :disabled="ocrPreviewList.length === 0">開始導入</button>
        </div>
      </div>
    </div>

    <!-- 批量操作彈窗 -->
    <div v-if="showBatchModal" class="modal-overlay" @click.self="showBatchModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>批量操作</h3>
          <span class="close-btn" @click="showBatchModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <p class="sub-desc">已勾選 {{ selectedMemberIds.length }} 名成員</p>
          
          <div class="form-row margin-v">
            <label>移動到幫會：</label>
            <select v-model="batchTargetGuild">
              <option v-for="g in guildList" :key="g.id" :value="g.name">{{ g.name }}</option>
            </select>
            <button class="btn-primary margin-l" @click="handleBatchMove">套用移動</button>
          </div>

          <hr />

          <button class="btn-danger full-width margin-t" @click="handleBatchDelete">批量刪除選中成員</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isDarkMode = ref(false)
const showMenu = ref(false)
const username = ref('VIP')

// 幫會列表
const guildList = ref([
  { id: 1, name: '天下雲五' },
  { id: 2, name: '未分配' }
])
const currentGuildId = ref(1)

// 可選流派列表
const availableSchools = ['九靈', '滄瀾', '潮光', '玄機', '碎夢', '神相', '素問', '血河', '鐵衣', '鴻音', '龍吟']

// 成員列表資料 (範例)
const members = ref([
  { id: 1, name: '行優', formerNames: [], schools: ['鐵衣'], currentSchool: '鐵衣', hasGodlyWeapon: false, guild: '天下雲五', status: '學徒', contact: '行優#1234', notes: '主力坦克', tether: '', attendance: 12, leave: 0, rolePref: '禦' },
  { id: 2, name: '鈍小鈍', formerNames: [], schools: ['九靈'], currentSchool: '九靈', hasGodlyWeapon: true, guild: '天下雲五', status: '幫眾', contact: '', notes: '', tether: '', attendance: 15, leave: 1, rolePref: '' },
  { id: 3, name: '章小燒', formerNames: [], schools: ['血河'], currentSchool: '血河', hasGodlyWeapon: false, guild: '天下雲五', status: '幫眾', contact: '', notes: '', tether: '', attendance: 10, leave: 0, rolePref: '' }
])

const searchQuery = ref('')
const selectedMemberIds = ref([])

// 表格顯示控制
const showColumnModal = ref(false)
const columns = ref({
  school: true,
  status: true,
  godlyWeapon: true,
  attendance: true,
  leave: true,
  rolePref: true,
  notes: true,
  contact: true
})

// 成員新增/編輯彈窗
const showMemberModal = ref(false)
const showFormerNamesModal = ref(false)
const editingMemberId = ref(null)

const memberForm = ref({
  name: '',
  formerNames: [],
  schools: [],
  currentSchool: '',
  hasGodlyWeapon: false,
  guild: '天下雲五',
  status: '幫眾',
  contact: '',
  notes: '',
  tether: '',
  rolePref: '未設置'
})

// 截圖導入
const showImportModal = ref(false)
const importTargetGuild = ref('天下雲五')
const fileInput = ref(null)
const ocrPreviewList = ref([])

// 批量操作
const showBatchModal = ref(false)
const batchTargetGuild = ref('天下雲五')

// 依當前幫會與搜尋文字篩選成員
const currentGuildName = computed(() => {
  const g = guildList.value.find(item => item.id === currentGuildId.value)
  return g ? g.name : ''
})

const filteredMembers = computed(() => {
  return members.value.filter(m => {
    const matchGuild = m.guild === currentGuildName.value
    const matchSearch = m.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    return matchGuild && matchSearch
  })
})

const getGuildMemberCount = (guildName) => {
  return members.value.filter(m => m.guild === guildName).length
}

// 多選控制
const isAllSelected = computed(() => {
  return filteredMembers.value.length > 0 && selectedMemberIds.value.length === filteredMembers.value.length
})

const toggleSelectAll = (e) => {
  if (e.target.checked) {
    selectedMemberIds.value = filteredMembers.value.map(m => m.id)
  } else {
    selectedMemberIds.value = []
  }
}

// 狀態標籤樣式
const getStatusClass = (status) => {
  if (status === '幫眾') return 'status-green'
  if (status === '學徒') return 'status-blue'
  return 'status-gray'
}

// 新增幫會
const openAddGuildModal = () => {
  const name = prompt('請輸入新幫會名稱：')
  if (name && name.trim()) {
    guildList.value.push({ id: Date.now(), name: name.trim() })
  }
}

// 流派限制最多選 2 個
const toggleSchoolSelection = (schoolName) => {
  const idx = memberForm.value.schools.indexOf(schoolName)
  if (idx > -1) {
    memberForm.value.schools.splice(idx, 1)
  } else {
    if (memberForm.value.schools.length >= 2) {
      alert('最多只能選擇 2 個流派！')
      return
    }
    memberForm.value.schools.push(schoolName)
  }

  // 自動設定第一個為當前流派
  if (memberForm.value.schools.length > 0) {
    memberForm.value.currentSchool = memberForm.value.schools[0]
  } else {
    memberForm.value.currentSchool = ''
  }
}

// 打開新增/編輯成員彈窗
const openMemberModal = (member = null) => {
  if (member) {
    editingMemberId.value = member.id
    memberForm.value = JSON.parse(JSON.stringify(member))
  } else {
    editingMemberId.value = null
    memberForm.value = {
      name: '',
      formerNames: [],
      schools: [],
      currentSchool: '',
      hasGodlyWeapon: false,
      guild: currentGuildName.value,
      status: '幫眾',
      contact: '',
      notes: '',
      tether: '',
      rolePref: '未設置'
    }
  }
  showMemberModal.value = true
}

// 儲存成員
const saveMember = () => {
  if (!memberForm.value.name.trim()) return alert('請輸入角色名！')
  if (memberForm.value.schools.length === 0) return alert('請至少選擇一個流派！')

  if (editingMemberId.value) {
    const idx = members.value.findIndex(m => m.id === editingMemberId.value)
    if (idx > -1) members.value[idx] = { ...memberForm.value, id: editingMemberId.value }
  } else {
    members.value.push({ ...memberForm.value, id: Date.now(), attendance: 0, leave: 0 })
  }

  showMemberModal.value = false
}

const deleteMember = (id) => {
  if (confirm('確定要刪除該成員嗎？')) {
    members.value = members.value.filter(m => m.id !== id)
  }
}

// 截圖上傳與識別模擬 (解析玩家名字與職業)
const triggerFileUpload = () => {
  fileInput.value.click()
}

const handleScreenshotUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return

  // 模擬 OCR 識別圖片中的「玩家名字」與「職業」
  ocrPreviewList.value = [
    { name: '可愛影', school: '龍吟' },
    { name: '夜小夜', school: '素問' },
    { name: '飛雪', school: '血河' },
    { name: '聆玨', school: '素問' }
  ]
}

const confirmImport = () => {
  ocrPreviewList.value.forEach(item => {
    members.value.push({
      id: Date.now() + Math.random(),
      name: item.name,
      formerNames: [],
      schools: [item.school],
      currentSchool: item.school,
      hasGodlyWeapon: false,
      guild: importTargetGuild.value,
      status: '幫眾',
      contact: '',
      notes: '截圖自動導入',
      tether: '',
      attendance: 0,
      leave: 0,
      rolePref: ''
    })
  })
  alert(`成功導入 ${ocrPreviewList.value.length} 名成員！`)
  ocrPreviewList.value = []
  showImportModal.value = false
}

// 批量操作
const handleBatchMove = () => {
  members.value.forEach(m => {
    if (selectedMemberIds.value.includes(m.id)) {
      m.guild = batchTargetGuild.value
    }
  })
  alert('批量移動成功！')
  selectedMemberIds.value = []
  showBatchModal.value = false
}

const handleBatchDelete = () => {
  if (confirm(`確定要刪除選中的 ${selectedMemberIds.value.length} 名成員嗎？`)) {
    members.value = members.value.filter(m => !selectedMemberIds.value.includes(m.id))
    selectedMemberIds.value = []
    showBatchModal.value = false
  }
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
.members-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
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
.members-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }
.guild-sidebar { width: 220px; background: #ffffff; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sidebar-header h3 { margin: 0; font-size: 15px; }
.btn-add-guild { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; font-weight: bold; }
.guild-list { list-style: none; padding: 0; margin: 0; }
.guild-list li { padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; justify-content: space-between; margin-bottom: 4px; }
.guild-list li.active, .guild-list li:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }
.guild-count { font-size: 11px; opacity: 0.6; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.toolbar { display: flex; justify-content: space-between; margin-bottom: 15px; }
.left-actions { display: flex; gap: 10px; align-items: center; }
.search-input { padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-danger { background: #ef4444; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-icon { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 16px; }

/* 資料表格 */
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }
.school-tag { background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
.status-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; }
.status-green { background: #dcfce7; color: #16a34a; }
.status-blue { background: #e0e7ff; color: #4338ca; }
.status-gray { background: #f1f5f9; color: #64748b; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }

/* 彈窗樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; max-height: 85vh; overflow-y: auto; }
.small-card { width: 380px; }
.medium-card { width: 500px; }
.large-card { width: 680px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row label { width: 120px; font-weight: bold; }
.form-row input[type="text"], .form-row select { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
.req { color: #ef4444; }
.school-selector { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.school-btn { border: 1px solid #cbd5e1; background: #f8fafc; padding: 4px 10px; border-radius: 15px; font-size: 12px; cursor: pointer; }
.school-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.margin-t { margin-top: 10px; }
.margin-v { margin: 15px 0; }
.full-width { width: 100%; }

/* 上傳框 */
.upload-box { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: #f8fafc; margin-top: 10px; }
.upload-icon { font-size: 32px; color: #94a3b8; }
.ocr-result-box { margin-top: 15px; background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; }
</style>