<template>
  <div :class="['members-layout', isDarkMode ? 'dark-theme' : 'light-theme']">
    <!-- 全局頂部導航列 -->
    <Navbar 
      activeNav="members" 
      :isDarkMode="isDarkMode" 
      :username="username" 
      @toggle-theme="isDarkMode = !isDarkMode" 
    />

    <!-- 主要內容區域 -->
    <div class="members-main">
      <!-- 左側：幫會列表側邊欄 -->
      <aside class="guild-sidebar">
        <div class="guild-header">
          <span class="guild-title">幫會</span>
          <button class="add-guild-btn" @click="openGuildModal()">+ 新增幫會</button>
        </div>

        <ul class="guild-menu">
          <li 
            :class="{ active: selectedGuildId === null }" 
            @click="selectedGuildId = null"
          >
            <span>全部成員</span>
            <span class="member-count">{{ memberList.length }} 人</span>
          </li>
          <li 
            v-for="guild in guildList" 
            :key="guild.id" 
            :class="{ active: selectedGuildId === guild.id }"
            @click="selectedGuildId = guild.id"
          >
            <span class="guild-name-text">{{ guild.name }}</span>
            <span class="member-count">{{ getGuildMemberCount(guild.name) }} 人</span>
          </li>
        </ul>
      </aside>

      <!-- 右側：成員表格內容區 -->
      <main class="content-area">
        <!-- 頂部工具列 -->
        <div class="toolbar">
          <div class="left-tools">
            <div class="search-input-wrapper">
              <i class="mdi mdi-magnify search-icon"></i>
              <input 
                type="text" 
                v-model="searchQuery" 
                placeholder="搜尋角色名..." 
                class="search-input"
              />
            </div>
            <button class="btn-primary" @click="openMemberModal()">新增成員</button>
            <button class="btn-secondary" @click="importScreenshot">截圖導入</button>
            <button class="btn-secondary" @click="batchOperation">批量操作</button>
          </div>

          <div class="right-tools">
            <button class="icon-btn" title="表格設定">
              <i class="mdi mdi-cog-outline"></i>
            </button>
          </div>
        </div>

        <!-- 成員表格 -->
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" v-model="selectAll" @change="toggleSelectAll" /></th>
                <th width="60">序號</th>
                <th>角色名</th>
                <th>流派</th>
                <th>幫眾狀態</th>
                <th width="80">神兵</th>
                <th width="70">出勤</th>
                <th width="70">請假</th>
                <th>職能偏好</th>
                <th>成員備註</th>
                <th>聯繫方式</th>
                <th width="110">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(member, index) in filteredMembers" :key="member.id">
                <td><input type="checkbox" v-model="member.selected" /></td>
                <td>{{ index + 1 }}</td>
                <td class="font-bold">{{ member.name }}</td>
                <td>
                  <span class="school-badge">{{ member.currentSchool }}</span>
                </td>
                <td>
                  <span class="status-tag">{{ member.guildStatus }}</span>
                </td>
                <td>{{ member.hasWeapon ? '有' : '—' }}</td>
                <td>{{ member.attendance }}</td>
                <td>{{ member.leaveCount }}</td>
                <td class="role-pref-cell">{{ formatRolePref(member.rolePreference) }}</td>
                <td>{{ member.note || '—' }}</td>
                <td>{{ member.contact || '—' }}</td>
                <td>
                  <button class="btn-link" @click="openMemberModal(member)">編輯</button>
                  <button class="btn-link text-red margin-l" @click="deleteMember(member.id)">刪除</button>
                </td>
              </tr>
              <tr v-if="filteredMembers.length === 0">
                <td colspan="12" class="empty-cell">暫無符合條件的成員資料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- 編輯 / 新增成員 Modal (對應圖一與圖二) -->
    <div v-if="showMemberModal" class="modal-overlay" @click.self="closeMemberModal">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>{{ editingMemberId ? '編輯成員' : '新增成員' }}</h3>
          <span class="close-btn" @click="closeMemberModal">&times;</span>
        </div>

        <div class="modal-body">
          <div class="form-section-title">基礎資訊</div>

          <div class="form-row">
            <label><span class="req">*</span>角色名：</label>
            <input type="text" v-model="memberForm.name" placeholder="請輸入角色名" class="flex-1" />
          </div>

          <div class="form-row align-start">
            <label><span class="req">*</span>流派列表：</label>
            <div class="school-pills-group">
              <button 
                v-for="s in availableSchools" 
                :key="s" 
                :class="['school-pill', { active: memberForm.schools.includes(s) }]"
                @click="toggleSchool(s)"
              >
                {{ s }}
              </button>
            </div>
          </div>

          <div class="form-row">
            <label><span class="req">*</span>當前流派：</label>
            <select v-model="memberForm.currentSchool" class="flex-1">
              <option v-for="s in memberForm.schools" :key="s" :value="s">{{ s }}</option>
            </select>
          </div>

          <div class="form-row">
            <label>神兵：</label>
            <input type="checkbox" v-model="memberForm.hasWeapon" />
          </div>

          <div class="form-row">
            <label>所屬幫會：</label>
            <select v-model="memberForm.guildName" class="flex-1">
              <option v-for="g in guildList" :key="g.id" :value="g.name">{{ g.name }}</option>
            </select>
          </div>

          <div class="form-row">
            <label>幫眾狀態：</label>
            <select v-model="memberForm.guildStatus" class="flex-1">
              <option value="學徒">學徒</option>
              <option value="幫眾">幫眾</option>
              <option value="堂主">堂主</option>
              <option value="副幫主">副幫主</option>
              <option value="幫主">幫主</option>
            </select>
          </div>

          <div class="form-row">
            <label>聯繫方式：</label>
            <input type="text" v-model="memberForm.contact" placeholder="如 Discord ID" class="flex-1" />
          </div>

          <div class="form-row">
            <label>成員備註：</label>
            <input type="text" v-model="memberForm.note" placeholder="如 主力坦克" class="flex-1" />
          </div>

          <div class="form-row">
            <label>一線率：</label>
            <input type="text" v-model="memberForm.firstLineRate" placeholder="輸入角色名搜尋" class="flex-1" />
          </div>

          <!-- 職能偏好 (圖二對應：可下拉多選選單) -->
          <div class="form-row align-start">
            <label>職能偏好：</label>
            <div class="custom-select-wrapper" @click.stop>
              <div 
                class="custom-select-input" 
                @click="showRoleDropdown = !showRoleDropdown"
              >
                <span :class="{ 'placeholder-text': !memberForm.rolePreference || memberForm.rolePreference.length === 0 }">
                  {{ displayRolePreference }}
                </span>
                <i :class="['mdi', 'mdi-chevron-down', 'select-arrow', { rotate: showRoleDropdown }]"></i>
              </div>

              <!-- 下拉選項面板 -->
              <div v-if="showRoleDropdown" class="custom-select-dropdown">
                <div 
                  v-for="role in personalRoleOptions" 
                  :key="role" 
                  :class="['dropdown-option-item', { selected: isRoleSelected(role) }]"
                  @click="toggleRolePreference(role)"
                >
                  <span>{{ role }}</span>
                  <i v-if="isRoleSelected(role)" class="mdi mdi-check check-icon"></i>
                </div>
              </div>
            </div>
          </div>

        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeMemberModal">取消</button>
          <button class="btn-primary" @click="saveMember">提交</button>
        </div>
      </div>
    </div>

    <!-- 新增幫會 Modal -->
    <div v-if="showGuildModal" class="modal-overlay" @click.self="showGuildModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>新增幫會</h3>
          <span class="close-btn" @click="showGuildModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label><span class="req">*</span>幫會名稱：</label>
            <input type="text" v-model="newGuildName" placeholder="請輸入幫會名稱" class="flex-1" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showGuildModal = false">取消</button>
          <button class="btn-primary" @click="saveGuild">確定</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/layout/Navbar.vue'

const router = useRouter()
const isDarkMode = ref(false)
const username = ref('VIP')

const searchQuery = ref('')
const selectedGuildId = ref(null)
const selectAll = ref(false)

// 幫會列表
const guildList = ref([
  { id: 1, name: '百鉈谷酒池肉林' },
  { id: 2, name: '天下雲五' }
])

// 17 項個人職能對應選單 (從戰備模組引進)
const personalRoleOptions = [
  'D潮拆塔', '保鏢拆', '埋頭猛拆', '塔仇主T', '增益絕', '奶絕', '指揮',
  '清泉人傷', '清泉保活', '灌大團', '點殺', '燒屍體', '破甲人傷',
  '純保鏢', '統戰', '騰龍保鏢', '騰龍合軸'
]

// 支援的所有流派
const availableSchools = ['鐵衣', '血河', '九靈', '神相', '碎夢', '素問', '龍吟', '玄機', '潮光', '滄瀾', '鴻音']

// 成員數據
const memberList = ref([
  { 
    id: 1, 
    name: '行優', 
    schools: ['鐵衣', '血河'], 
    currentSchool: '鐵衣', 
    guildName: '百鉈谷酒池肉林', 
    guildStatus: '學徒', 
    hasWeapon: false, 
    attendance: 12, 
    leaveCount: 0, 
    rolePreference: ['禦'], 
    note: '主力坦克', 
    contact: '行優#1234', 
    firstLineRate: '',
    selected: false 
  },
  { 
    id: 2, 
    name: '銃銃', 
    schools: ['九靈'], 
    currentSchool: '九靈', 
    guildName: '百鉈谷酒池肉林', 
    guildStatus: '幫眾', 
    hasWeapon: true, 
    attendance: 15, 
    leaveCount: 1, 
    rolePreference: [], 
    note: '', 
    contact: '', 
    firstLineRate: '',
    selected: false 
  }
])

// 依幫會過濾成員數
const getGuildMemberCount = (guildName) => {
  return memberList.value.filter(m => m.guildName === guildName).length
}

// 關鍵字與幫會篩選成員
const filteredMembers = computed(() => {
  return memberList.value.filter(m => {
    const matchSearch = m.name.toLowerCase().includes(searchQuery.value.toLowerCase().trim())
    if (selectedGuildId.value === null) return matchSearch
    const guild = guildList.value.find(g => g.id === selectedGuildId.value)
    return matchSearch && guild && m.guildName === guild.name
  })
})

const toggleSelectAll = () => {
  filteredMembers.value.forEach(m => m.selected = selectAll.value)
}

// 格式化職能偏好顯示 (表格中)
const formatRolePref = (pref) => {
  if (!pref || !Array.isArray(pref) || pref.length === 0) return '未設置'
  return pref.join('、')
}

// 成員彈窗控制
const showMemberModal = ref(false)
const editingMemberId = ref(null)
const showRoleDropdown = ref(false)

const memberForm = ref({
  name: '',
  schools: ['鐵衣'],
  currentSchool: '鐵衣',
  hasWeapon: false,
  guildName: '百鉈谷酒池肉林',
  guildStatus: '幫眾',
  contact: '',
  note: '',
  firstLineRate: '',
  rolePreference: []
})

// 下拉選單顯示狀態
const displayRolePreference = computed(() => {
  const pref = memberForm.value.rolePreference
  if (!pref || !Array.isArray(pref) || pref.length === 0) {
    return '未設置 (可多選)'
  }
  return pref.join(', ')
})

const isRoleSelected = (roleName) => {
  return Array.isArray(memberForm.value.rolePreference) && memberForm.value.rolePreference.includes(roleName)
}

const toggleRolePreference = (roleName) => {
  if (!Array.isArray(memberForm.value.rolePreference)) {
    memberForm.value.rolePreference = []
  }
  const idx = memberForm.value.rolePreference.indexOf(roleName)
  if (idx > -1) {
    memberForm.value.rolePreference.splice(idx, 1)
  } else {
    memberForm.value.rolePreference.push(roleName)
  }
}

const toggleSchool = (s) => {
  const idx = memberForm.value.schools.indexOf(s)
  if (idx > -1) {
    if (memberForm.value.schools.length > 1) {
      memberForm.value.schools.splice(idx, 1)
      if (memberForm.value.currentSchool === s) {
        memberForm.value.currentSchool = memberForm.value.schools[0]
      }
    }
  } else {
    memberForm.value.schools.push(s)
  }
}

const openMemberModal = (member = null) => {
  showRoleDropdown.value = false
  if (member) {
    editingMemberId.value = member.id
    memberForm.value = { 
      ...member, 
      schools: [...member.schools],
      rolePreference: Array.isArray(member.rolePreference) ? [...member.rolePreference] : [] 
    }
  } else {
    editingMemberId.value = null
    memberForm.value = {
      name: '',
      schools: ['鐵衣'],
      currentSchool: '鐵衣',
      hasWeapon: false,
      guildName: guildList.value[0]?.name || '',
      guildStatus: '幫眾',
      contact: '',
      note: '',
      firstLineRate: '',
      rolePreference: []
    }
  }
  showMemberModal.value = true
}

const closeMemberModal = () => {
  showMemberModal.value = false
  showRoleDropdown.value = false
}

const saveMember = () => {
  if (!memberForm.value.name.trim()) return alert('請輸入角色名！')

  if (editingMemberId.value) {
    const idx = memberList.value.findIndex(m => m.id === editingMemberId.value)
    if (idx > -1) {
      memberList.value[idx] = { ...memberList.value[idx], ...memberForm.value }
    }
  } else {
    memberList.value.push({
      id: Date.now(),
      ...memberForm.value,
      attendance: 0,
      leaveCount: 0,
      selected: false
    })
  }
  closeMemberModal()
}

const deleteMember = (id) => {
  if (confirm('確定要刪除該成員嗎？')) {
    memberList.value = memberList.value.filter(m => m.id !== id)
  }
}

// 點擊空白處關閉下拉選單
const handleDocumentClick = () => {
  showRoleDropdown.value = false
}

// 幫會彈窗控制
const showGuildModal = ref(false)
const newGuildName = ref('')

const openGuildModal = () => {
  newGuildName.value = ''
  showGuildModal.value = true
}

const saveGuild = () => {
  if (!newGuildName.value.trim()) return alert('請輸入幫會名稱！')
  guildList.value.push({ id: Date.now(), name: newGuildName.value.trim() })
  showGuildModal.value = false
}

const importScreenshot = () => alert('截圖導入功能開發中...')
const batchOperation = () => alert('請先勾選需要操作的成員！')

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user) username.value = user.username
  else router.push('/login')
  window.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  window.removeEventListener('click', handleDocumentClick)
})
</script>

<style scoped>
.members-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.light-theme { background-color: #f4f6f9; color: #2c3e50; }
.dark-theme { background-color: #121824; color: #e2e8f0; }

.members-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }

/* 左側幫會側邊欄 */
.guild-sidebar { width: 220px; background: #ffffff; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.guild-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.guild-title { font-weight: bold; font-size: 14px; }
.add-guild-btn { background: none; border: none; color: #3b82f6; font-size: 12px; cursor: pointer; }

.guild-menu { list-style: none; padding: 0; margin: 0; }
.guild-menu li { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 4px; color: #64748b; }
.guild-menu li.active, .guild-menu li:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }
.guild-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; }
.member-count { font-size: 11px; color: #94a3b8; }

/* 右側內容區 */
.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.left-tools { display: flex; align-items: center; gap: 10px; }
.search-input-wrapper { position: relative; width: 180px; display: flex; align-items: center; }
.search-icon { position: absolute; left: 8px; color: #94a3b8; font-size: 16px; }
.search-input { width: 100%; padding: 6px 12px 6px 28px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }
.font-bold { font-weight: bold; }
.margin-l { margin-left: 10px; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

.school-badge { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.status-tag { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.role-pref-cell { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #475569; }

/* Modal 與表單 (圖一/圖二對應) */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.small-card { width: 380px; }
.medium-card { width: 480px; max-height: 90vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-section-title { font-weight: bold; font-size: 14px; border-left: 3px solid #3b82f6; padding-left: 8px; margin-bottom: 15px; }

.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row.align-start { align-items: flex-start; }
.form-row label { width: 90px; font-weight: bold; }
.form-row input[type="text"], .form-row select { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.flex-1 { flex: 1; }
.req { color: #ef4444; }

.school-pills-group { display: flex; flex-wrap: wrap; gap: 6px; flex: 1; }
.school-pill { border: 1px solid #cbd5e1; background: #ffffff; padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; color: #475569; }
.school-pill.active { background: #eff6ff; color: #2563eb; border-color: #3b82f6; font-weight: bold; }

/* 下拉複選框組件樣式 (圖二對應) */
.custom-select-wrapper { position: relative; flex: 1; }
.custom-select-input { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 6px 10px; 
  border: 1px solid #cbd5e1; 
  border-radius: 6px; 
  background: white; 
  cursor: pointer; 
  font-size: 13px;
  min-height: 18px;
}
.placeholder-text { color: #94a3b8; }
.select-arrow { font-size: 16px; color: #94a3b8; transition: transform 0.2s; }
.select-arrow.rotate { transform: rotate(180deg); }

.custom-select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  width: 100%;
  margin-top: 4px;
  background: white;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  max-height: 220px;
  overflow-y: auto;
  z-index: 120;
  padding: 4px 0;
}

.dropdown-option-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 13px;
  cursor: pointer;
  color: #334155;
  transition: background 0.15s;
}

.dropdown-option-item:hover {
  background: #f1f5f9;
}

.dropdown-option-item.selected {
  color: #2563eb;
  font-weight: bold;
  background: #eff6ff;
}

.check-icon { font-size: 16px; color: #2563eb; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }
</style>