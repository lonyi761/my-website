<template>
  <div :class="['prep-layout', isDarkMode ? 'dark-theme' : 'light-theme']">
    <!-- 頂部導航列 -->
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

    <!-- 主要內容區 -->
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

      <!-- 右側內容區 -->
      <main class="content-area">
        
        <!-- Tab 1: 職能管理 -->
        <div v-if="currentTab === 'roles'">
          <div class="prep-header">
            <h2>職能管理</h2>
            <p class="sub-notice">
              按個人職能、小隊職能分別維護選項表，互不混用。拖動最左側圖示可保存當前類型內的順序。
            </p>
          </div>

          <div class="toolbar">
            <div class="sub-tabs">
              <button :class="['sub-tab-btn', { active: roleCategory === 'personal' }]" @click="roleCategory = 'personal'">個人職能</button>
              <button :class="['sub-tab-btn', { active: roleCategory === 'squad' }]" @click="roleCategory = 'squad'">小隊職能</button>
            </div>

            <div class="right-actions">
              <button class="btn-primary" @click="openRoleModal()">
                + 新增{{ roleCategory === 'personal' ? '個人' : '小隊' }}職能
              </button>
            </div>
          </div>

          <!-- 精簡欄位後的職能表格 -->
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th width="40"></th>
                  <th>職能名稱</th>
                  <th>描述</th>
                  <th width="100">標籤開關</th>
                  <th width="110">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr 
                  v-for="(role, index) in currentRoleList" 
                  :key="role.id"
                  draggable="true"
                  @dragstart="onDragStart(index)"
                  @dragover.prevent
                  @drop="onDrop(index)"
                  :class="{ 'dragging-row': dragIndex === index }"
                >
                  <td>
                    <div class="drag-handle-cell" title="按住拖曳上下拉動排序">
                      <span class="drag-icon">☰</span>
                    </div>
                  </td>
                  <td class="font-bold">{{ role.name }}</td>
                  <td>{{ role.desc || '—' }}</td>
                  <td>
                    <label class="switch">
                      <input type="checkbox" v-model="role.tagSwitch" />
                      <span class="slider"></span>
                    </label>
                  </td>
                  <td>
                    <button class="btn-link" @click="openRoleModal(role)">編輯</button>
                    <button class="btn-link text-red margin-l" @click="deleteRole(role.id)">刪除</button>
                  </td>
                </tr>
                <tr v-if="currentRoleList.length === 0">
                  <td colspan="5" class="empty-cell">暫無職能資料</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 2: 配裝管理 -->
        <div v-else-if="currentTab === 'equip'">
          <div class="prep-header">
            <h2>配裝管理</h2>
            <p class="sub-notice">管理幫會成員的絕技、群俠與裝備套裝設定，可在排表中直接引用。</p>
          </div>
          <div class="toolbar">
            <button class="btn-primary" @click="openBuildModal()">+ 新增配裝範本</button>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th width="60">序號</th>
                  <th>配裝名稱</th>
                  <th>推薦絕技</th>
                  <th>推薦群俠</th>
                  <th>推薦裝備</th>
                  <th width="120">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(b, idx) in buildList" :key="b.id">
                  <td>{{ idx + 1 }}</td>
                  <td class="font-bold">{{ b.name }}</td>
                  <td>{{ b.jueji }}</td>
                  <td>{{ b.qunxia }}</td>
                  <td>{{ b.zhuangbei }}</td>
                  <td>
                    <button class="btn-link" @click="openBuildModal(b)">編輯</button>
                    <button class="btn-link text-red margin-l" @click="deleteBuild(b.id)">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tab 3: 排表模板 -->
        <div v-else-if="currentTab === 'template'">
          <div class="prep-header">
            <h2>排表模板 (150人標準陣型)</h2>
            <p class="sub-notice">包含 5 個大隊、25 個小隊、共 150 個槽位，可針對每個槽位設定預設職能與流派。</p>
          </div>
          <div class="template-matrix">
            <div v-for="(team, tIdx) in templateData.teams" :key="tIdx" class="team-card">
              <h3 class="team-title">{{ team.name }} ({{ team.squads.length }} 小隊)</h3>
              <div class="squad-grid">
                <div v-for="(squad, sIdx) in team.squads" :key="sIdx" class="squad-box">
                  <div class="squad-head">
                    <span>{{ squad.name }}</span>
                    <select v-model="squad.zhineng" class="squad-input">
                      <option value="">選擇小隊職能</option>
                      <option v-for="sq in squadRoleList" :key="sq.id" :value="sq.name">{{ sq.name }}</option>
                    </select>
                  </div>
                  <div class="slot-list">
                    <div v-for="(slot, slotIdx) in squad.slots" :key="slotIdx" class="slot-item">
                      <span class="slot-num">#{{ slotIdx + 1 }}</span>
                      <select v-model="slot.zhineng_list[0]" class="slot-select">
                        <option value="">選取個人職能</option>
                        <option v-for="r in personalRoleList" :key="r.id" :value="r.name">{{ r.name }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 5: 報名問題 -->
        <div v-else-if="currentTab === 'faq'">
          <div class="prep-header">
            <h2>報名問題管理</h2>
            <p class="sub-notice">設定成員報名聯賽時需要填寫的調查題目。</p>
          </div>
          <div class="toolbar">
            <button class="btn-primary" @click="openQuestionModal()">+ 新增報名問題</button>
          </div>
          <div class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th width="60">排序</th>
                  <th>題目名稱</th>
                  <th>問題類型</th>
                  <th>選項內容</th>
                  <th width="80">必填</th>
                  <th width="120">操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="q in questionList" :key="q.id">
                  <td>{{ q.sort_order }}</td>
                  <td class="font-bold">{{ q.title }}</td>
                  <td>{{ q.type === 'radio' ? '單選題' : q.type === 'checkbox' ? '多選題' : '簡答題' }}</td>
                  <td>{{ q.options.join(' / ') || '—' }}</td>
                  <td>{{ q.is_required ? '是' : '否' }}</td>
                  <td>
                    <button class="btn-link" @click="openQuestionModal(q)">編輯</button>
                    <button class="btn-link text-red margin-l" @click="deleteQuestion(q.id)">刪除</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- 其他頁籤占位 -->
        <div v-else class="empty-tab-box">
          <h3>{{ currentTab === 'recruit' ? '廣場招募' : '積分管理' }}</h3>
          <p>功能開發中...</p>
        </div>

      </main>
    </div>

    <!-- 職能 Modal -->
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
            <input type="text" v-model="roleForm.desc" placeholder="請輸入描述" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showRoleModal = false">取消</button>
          <button class="btn-primary" @click="saveRole">確定</button>
        </div>
      </div>
    </div>

    <!-- 配裝 Modal -->
    <div v-if="showBuildModal" class="modal-overlay" @click.self="showBuildModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>{{ editingBuildId ? '編輯配裝' : '新增配裝' }}</h3>
          <span class="close-btn" @click="showBuildModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label><span class="req">*</span>配裝名稱：</label>
            <input type="text" v-model="buildForm.name" placeholder="如：拆塔爆發流" />
          </div>
          <div class="form-row">
            <label>推薦絕技：</label>
            <input type="text" v-model="buildForm.jueji" placeholder="如：殘陽夜月" />
          </div>
          <div class="form-row">
            <label>推薦群俠：</label>
            <input type="text" v-model="buildForm.qunxia" placeholder="如：方承意" />
          </div>
          <div class="form-row">
            <label>推薦裝備：</label>
            <input type="text" v-model="buildForm.zhuangbei" placeholder="如：75百煉破甲套" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showBuildModal = false">取消</button>
          <button class="btn-primary" @click="saveBuild">確定</button>
        </div>
      </div>
    </div>

    <!-- 報名問題 Modal -->
    <div v-if="showQuestionModal" class="modal-overlay" @click.self="showQuestionModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>{{ editingQuestionId ? '編輯報名問題' : '新增報名問題' }}</h3>
          <span class="close-btn" @click="showQuestionModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label><span class="req">*</span>題目名稱：</label>
            <input type="text" v-model="questionForm.title" placeholder="請輸入問題標題" />
          </div>
          <div class="form-row">
            <label>問題類型：</label>
            <select v-model="questionForm.type">
              <option value="radio">單選題</option>
              <option value="checkbox">多選題</option>
              <option value="text">簡答題</option>
            </select>
          </div>
          <div class="form-row" v-if="questionForm.type !== 'text'">
            <label>選項 (逗號分開)：</label>
            <input type="text" v-model="questionForm.optionsStr" placeholder="選項一, 選項二, 選項三" />
          </div>
          <div class="form-row">
            <label>是否必填：</label>
            <input type="checkbox" v-model="questionForm.is_required" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showQuestionModal = false">取消</button>
          <button class="btn-primary" @click="saveQuestion">確定</button>
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

const currentTab = ref('roles')
const roleCategory = ref('personal')

// 1. 個人職能數據
const personalRoleList = ref([
  { id: 1, name: 'D潮拆塔', desc: '—', tagSwitch: false },
  { id: 2, name: '保鏢拆', desc: '—', tagSwitch: false },
  { id: 3, name: '埋頭猛拆', desc: '—', tagSwitch: false },
  { id: 4, name: '塔仇主T', desc: '—', tagSwitch: false },
  { id: 5, name: '增益絕', desc: '—', tagSwitch: false },
  { id: 6, name: '奶絕', desc: '—', tagSwitch: false },
  { id: 7, name: '指揮', desc: '—', tagSwitch: false },
  { id: 8, name: '清泉人傷', desc: '—', tagSwitch: false },
  { id: 9, name: '清泉保活', desc: '—', tagSwitch: false },
  { id: 10, name: '灌大團', desc: '—', tagSwitch: false },
  { id: 11, name: '點殺', desc: '—', tagSwitch: false },
  { id: 12, name: '燒屍體', desc: '—', tagSwitch: false },
  { id: 13, name: '破甲人傷', desc: '—', tagSwitch: false },
  { id: 14, name: '純保鏢', desc: '—', tagSwitch: false },
  { id: 15, name: '統戰', desc: '—', tagSwitch: false },
  { id: 16, name: '騰龍保鏢', desc: '—', tagSwitch: false },
  { id: 17, name: '騰龍合軸', desc: '—', tagSwitch: false }
])

// 2. 小隊職能數據
const squadRoleList = ref([
  { id: 101, name: '保鏢隊', desc: '—', tagSwitch: false },
  { id: 102, name: '雙碎隊', desc: '—', tagSwitch: false },
  { id: 103, name: '雙神隊', desc: '—', tagSwitch: false },
  { id: 104, name: '塔前隊', desc: '—', tagSwitch: false },
  { id: 105, name: '塔後隊', desc: '—', tagSwitch: false },
  { id: 106, name: '請假隊', desc: '—', tagSwitch: false },
  { id: 107, name: '輪空隊', desc: '—', tagSwitch: false }
])

// 動態依據子分頁取得當前編輯的職能清單
const currentRoleList = computed(() => {
  return roleCategory.value === 'personal' ? personalRoleList.value : squadRoleList.value
})

// 拖曳排序邏輯
const dragIndex = ref(null)

const onDragStart = (index) => {
  dragIndex.value = index
}

const onDrop = (targetIndex) => {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const list = currentRoleList.value
  const movedItem = list.splice(dragIndex.value, 1)[0]
  list.splice(targetIndex, 0, movedItem)
  dragIndex.value = null
}

// 配裝數據
const buildList = ref([
  { id: 1, name: '拆塔爆發流', jueji: '殘陽夜月', qunxia: '方承意', zhuangbei: '75百煉破甲套' },
  { id: 2, name: '主T高防禦流', jueji: '太極圖', qunxia: '葉雪青', zhuangbei: '75百煉禦鐵套' },
  { id: 3, name: '廣域純奶流', jueji: '長歌獻君', qunxia: '無情', zhuangbei: '75百煉素問套' }
])

// 報名問題數據
const questionList = ref([
  { id: 1, title: '本週聯賽是否能準時出席？', type: 'radio', options: ['能準時出席', '需要請假', '不確定/晚到'], is_required: true, sort_order: 1 },
  { id: 2, title: '請選擇您的主力流派與次要流派', type: 'text', options: [], is_required: true, sort_order: 2 },
  { id: 3, title: '請填寫您的 Discord / 語音頻道 ID', type: 'text', options: [], is_required: false, sort_order: 3 }
])

// 排表數據生成
const DEFAULT_TEAM_NAMES = ['一隊', '二隊', '三隊', '四隊', '五隊']

function createDefaultSlot() {
  return {
    liupai_list: [],
    liupai_xingtai_map: {},
    zhineng_list: [''],
    desc: '',
    jueji_pz: '',
    qunxia_pz: '',
    zhuangbei_pz: ''
  }
}

function createDefaultSquad(squadIdx) {
  return {
    hidden: false,
    name: `${squadIdx + 1}小隊`,
    zhineng: '',
    desc: '',
    slots: Array.from({ length: 6 }, () => createDefaultSlot())
  }
}

function createDefaultTeam(teamIdx) {
  return {
    hidden: false,
    name: DEFAULT_TEAM_NAMES[teamIdx] || `${teamIdx + 1}隊`,
    desc: '',
    squads: Array.from({ length: 5 }, (_, i) => createDefaultSquad(i))
  }
}

function createDefaultTemplate() {
  return {
    teams: Array.from({ length: 5 }, (_, i) => createDefaultTeam(i))
  }
}

const templateData = ref(createDefaultTemplate())

// Modal 控制邏輯
const showRoleModal = ref(false)
const editingRoleId = ref(null)
const roleForm = ref({ name: '', desc: '' })

const showBuildModal = ref(false)
const editingBuildId = ref(null)
const buildForm = ref({ name: '', jueji: '', qunxia: '', zhuangbei: '' })

const showQuestionModal = ref(false)
const editingQuestionId = ref(null)
const questionForm = ref({ title: '', type: 'radio', optionsStr: '', is_required: true })

const openRoleModal = (role = null) => {
  if (role) {
    editingRoleId.value = role.id
    roleForm.value = { ...role }
  } else {
    editingRoleId.value = null
    roleForm.value = { name: '', desc: '' }
  }
  showRoleModal.value = true
}

const saveRole = () => {
  if (!roleForm.value.name.trim()) return alert('請輸入職能名稱！')
  const targetList = currentRoleList.value

  if (editingRoleId.value) {
    const idx = targetList.findIndex(r => r.id === editingRoleId.value)
    if (idx > -1) targetList[idx] = { ...targetList[idx], ...roleForm.value }
  } else {
    targetList.push({ 
      id: Date.now(), 
      name: roleForm.value.name.trim(),
      desc: roleForm.value.desc.trim(),
      tagSwitch: false
    })
  }
  showRoleModal.value = false
}

const deleteRole = (id) => {
  if (confirm('確定要刪除該職能嗎？')) {
    if (roleCategory.value === 'personal') {
      personalRoleList.value = personalRoleList.value.filter(r => r.id !== id)
    } else {
      squadRoleList.value = squadRoleList.value.filter(r => r.id !== id)
    }
  }
}

const openBuildModal = (b = null) => {
  if (b) {
    editingBuildId.value = b.id
    buildForm.value = { ...b }
  } else {
    editingBuildId.value = null
    buildForm.value = { name: '', jueji: '', qunxia: '', zhuangbei: '' }
  }
  showBuildModal.value = true
}

const saveBuild = () => {
  if (!buildForm.value.name.trim()) return alert('請輸入配裝名稱！')
  if (editingBuildId.value) {
    const idx = buildList.value.findIndex(b => b.id === editingBuildId.value)
    if (idx > -1) buildList.value[idx] = { ...buildForm.value, id: editingBuildId.value }
  } else {
    buildList.value.push({ id: Date.now(), ...buildForm.value })
  }
  showBuildModal.value = false
}

const deleteBuild = (id) => {
  if (confirm('確定要刪除該配裝嗎？')) buildList.value = buildList.value.filter(b => b.id !== id)
}

const openQuestionModal = (q = null) => {
  if (q) {
    editingQuestionId.value = q.id
    questionForm.value = { ...q, optionsStr: q.options.join(', ') }
  } else {
    editingQuestionId.value = null
    questionForm.value = { title: '', type: 'radio', optionsStr: '', is_required: true }
  }
  showQuestionModal.value = true
}

const saveQuestion = () => {
  if (!questionForm.value.title.trim()) return alert('請輸入題目名稱！')
  const opts = questionForm.value.optionsStr ? questionForm.value.optionsStr.split(',').map(s => s.trim()).filter(Boolean) : []
  if (editingQuestionId.value) {
    const idx = questionList.value.findIndex(q => q.id === editingQuestionId.value)
    if (idx > -1) questionList.value[idx] = { ...questionForm.value, options: opts, id: editingQuestionId.value }
  } else {
    questionList.value.push({ id: Date.now(), ...questionForm.value, options: opts, sort_order: questionList.value.length + 1 })
  }
  showQuestionModal.value = false
}

const deleteQuestion = (id) => {
  if (confirm('確定要刪除該問題嗎？')) questionList.value = questionList.value.filter(q => q.id !== id)
}

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user) username.value = user.username
  else router.push('/login')
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
.brand-logo { font-size: 16px; font-weight: bold; }
.nav-center a { margin: 0 15px; text-decoration: none; color: inherit; opacity: 0.7; font-size: 14px; }
.nav-center a.active { opacity: 1; font-weight: 600; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
.nav-right { display: flex; align-items: center; gap: 15px; }
.icon-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; }
.user-dropdown { position: relative; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px; }

.prep-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }
.prep-sidebar { width: 180px; background: #ffffff; border-radius: 8px; padding: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-menu { list-style: none; padding: 0; margin: 0; }
.sidebar-menu li { padding: 12px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 4px; color: #64748b; transition: all 0.2s; }
.sidebar-menu li.active, .sidebar-menu li:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.prep-header h2 { margin: 0 0 8px 0; font-size: 16px; }
.sub-notice { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #3b82f6; }

.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sub-tabs { display: flex; gap: 15px; border-bottom: 1px solid #e2e8f0; }
.sub-tab-btn { background: none; border: none; padding: 8px 4px; font-size: 13px; cursor: pointer; color: #64748b; position: relative; }
.sub-tab-btn.active { color: #2563eb; font-weight: bold; }
.sub-tab-btn.active::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: #2563eb; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

/* 拖曳欄位樣式 */
.data-table tr[draggable="true"] { cursor: grab; }
.data-table tr.dragging-row { opacity: 0.4; background: #f1f5f9; }
.drag-handle-cell { display: flex; align-items: center; justify-content: center; color: #64748b; user-select: none; }
.drag-icon { font-size: 16px; color: #94a3b8; }

/* 150人排表矩陣樣式 */
.template-matrix { display: flex; flex-direction: column; gap: 20px; }
.team-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
.team-title { margin: 0 0 12px 0; font-size: 15px; color: #1e293b; }
.squad-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.squad-box { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
.squad-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: bold; font-size: 12px; }
.squad-input { width: 100px; padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; }
.slot-list { display: flex; flex-direction: column; gap: 4px; }
.slot-item { display: flex; align-items: center; justify-content: space-between; font-size: 11px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
.slot-select { font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; }

/* Switch */
.switch { position: relative; display: inline-block; width: 34px; height: 18px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 18px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(16px); }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.small-card { width: 380px; }
.medium-card { width: 500px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row label { width: 110px; font-weight: bold; }
.form-row input[type="text"], .form-row select { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
.req { color: #ef4444; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.empty-tab-box { text-align: center; padding: 50px; color: #94a3b8; }
.empty-cell { text-align: center; color: #94a3b8; padding: 20px; }
</style>