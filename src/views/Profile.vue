<template>
  <div :class="['members-layout', isDarkMode ? 'dark-theme' : 'light-theme']" @click="closePopover">
    <!-- 頂部導航列 -->
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
            :class="['guild-item', { active: currentGuildId === guild.id }]"
            @click="currentGuildId = guild.id"
          >
            <div class="guild-info">
              <span class="guild-name">{{ guild.name }}</span>
              <span class="guild-count">{{ getGuildMemberCount(guild.name) }} 人</span>
            </div>
            <div class="guild-actions" v-if="guild.name !== '未分配'" @click.stop>
              <button class="btn-icon-sm" @click="openEditGuildModal(guild)" title="幫會設定">
                <i class="mdi mdi-cog-outline"></i>
              </button>
            </div>
          </li>
        </ul>
      </aside>

      <!-- 右側：成員資料表格 -->
      <main class="content-area">
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

                <!-- 流派點擊跳出快切選單 -->
                <td v-if="columns.school">
                  <div class="school-popover-wrapper" @click.stop>
                    <div class="school-cell clickable" @click="toggleSchoolPopover(member.id)" title="點擊切換流派">
                      <img 
                        v-if="getSchoolInfo(member.currentSchool).file"
                        :src="getSchoolImg(getSchoolInfo(member.currentSchool).file)" 
                        class="school-img-badge" 
                        :alt="member.currentSchool" 
                      />
                      <span v-else class="school-text-badge">{{ member.currentSchool }}</span>
                    </div>

                    <!-- PopOver 快切選單 -->
                    <div v-if="activePopoverMemberId === member.id" class="school-popover-box">
                      <div class="popover-arrow"></div>
                      <button 
                        v-for="sName in (member.schools.length > 0 ? member.schools : [member.currentSchool])" 
                        :key="sName"
                        :class="['popover-school-btn', { active: member.currentSchool === sName }]"
                        @click="quickSwitchSchool(member, sName)"
                      >
                        <img 
                          v-if="getSchoolInfo(sName).file" 
                          :src="getSchoolImg(getSchoolInfo(sName).file)" 
                          class="popover-btn-img" 
                        />
                        <span>{{ sName }}</span>
                      </button>
                    </div>
                  </div>
                </td>

                <!-- 幫眾狀態點擊快切選單 -->
                <td v-if="columns.status">
                  <div class="status-popover-wrapper" @click.stop>
                    <span 
                      :class="['status-badge', 'clickable', getStatusClass(member.status)]"
                      @click="toggleStatusPopover(member.id)"
                      title="點擊切換狀態"
                    >
                      {{ member.status }}
                    </span>

                    <div v-if="activeStatusPopoverMemberId === member.id" class="status-popover-box">
                      <div class="popover-arrow"></div>
                      <button 
                        v-for="st in ['幫眾', '學徒', '退幫']" 
                        :key="st"
                        :class="['popover-status-btn', getStatusClass(st), { active: member.status === st }]"
                        @click="quickSwitchStatus(member, st)"
                      >
                        {{ st }}
                      </button>
                    </div>
                  </div>
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

    <!-- 表格列設置彈窗 -->
    <div v-if="showColumnModal" class="modal-overlay" @click.self="showColumnModal = false">
      <div class="modal-card wide-card">
        <div class="modal-header">
          <h3>表格列設置</h3>
          <span class="close-btn" @click="showColumnModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="column-hint-box">勾選顯示列，拖拽手柄調整順序。</div>
          <div class="column-grid">
            <div v-for="col in columnList" :key="col.key" class="column-item">
              <span class="drag-handle">=</span>
              <label>
                <input type="checkbox" v-model="columns[col.key]" />
                {{ col.label }}
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showColumnModal = false">取消</button>
          <button class="btn-primary" @click="showColumnModal = false">確定</button>
        </div>
      </div>
    </div>

    <!-- 幫會設定彈窗 -->
    <div v-if="showGuildEditModal" class="modal-overlay" @click.self="showGuildEditModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>幫會設定</h3>
          <span class="close-btn" @click="showGuildEditModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>幫會名稱：</label>
            <input type="text" v-model="editingGuildName" />
          </div>
          <button class="btn-danger full-width margin-t" @click="deleteGuild">移除幫會 (成員移至未分配)</button>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showGuildEditModal = false">取消</button>
          <button class="btn-primary" @click="saveGuildName">儲存</button>
        </div>
      </div>
    </div>

    <!-- 新增/編輯成員彈窗 -->
    <div v-if="showMemberModal" class="modal-overlay" @click.self="showMemberModal = false">
      <div class="modal-card large-card">
        <div class="modal-header">
          <h3>{{ editingMemberId ? '編輯成員' : '新增成員' }}</h3>
          <span class="close-btn" @click="showMemberModal = false">&times;</span>
        </div>
        <div class="modal-body form-grid">
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
              <label><span class="req">*</span>流派列表：</label>
              <div class="school-selector">
                <button 
                  v-for="s in availableSchools" 
                  :key="s.name" 
                  :class="['school-btn-card', { active: memberForm.schools.includes(s.name) }]"
                  :style="{ '--badge-color': s.color, '--badge-bg': s.bg }"
                  @click="toggleSchoolSelection(s.name)"
                >
                  <img v-if="s.file" :src="getSchoolImg(s.file)" class="btn-img-icon" />
                  <span>{{ s.name }}</span>
                  <span v-if="role === 'admin' && s.isCustom" class="del-school-x" @click.stop="deleteSchool(s.name)">&times;</span>
                </button>
                <button v-if="role === 'admin'" class="btn-add-school" @click="handleAddSchool">+ 新增流派</button>
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
          <div v-for="(name, idx) in memberForm.formerNames" :key="idx" class="former-name-item margin-v">
            <input type="text" v-model="memberForm.formerNames[idx]" />
            <button class="btn-link text-red margin-l" @click="memberForm.formerNames.splice(idx, 1)">刪除</button>
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
const role = ref('admin')

// Popover 控制
const activePopoverMemberId = ref(null)
const activeStatusPopoverMemberId = ref(null)

const toggleSchoolPopover = (memberId) => {
  activeStatusPopoverMemberId.value = null
  activePopoverMemberId.value = activePopoverMemberId.value === memberId ? null : memberId
}

const toggleStatusPopover = (memberId) => {
  activePopoverMemberId.value = null
  activeStatusPopoverMemberId.value = activeStatusPopoverMemberId.value === memberId ? null : memberId
}

const closePopover = () => {
  activePopoverMemberId.value = null
  activeStatusPopoverMemberId.value = null
  showMenu.value = false
}

const quickSwitchSchool = (member, schoolName) => {
  member.currentSchool = schoolName
  activePopoverMemberId.value = null
}

const quickSwitchStatus = (member, status) => {
  member.status = status
  activeStatusPopoverMemberId.value = null
}

// 幫會列表 (更新預設幫會名稱)
const guildList = ref([
  { id: 1, name: '百錵谷酒池肉林' },
  { id: 2, name: '未分配' }
])
const currentGuildId = ref(1)
const showGuildEditModal = ref(false)
const targetEditGuild = ref(null)
const editingGuildName = ref('')

// 可選流派與對應 PNG 檔名
const availableSchools = ref([
  { name: '鐵衣', file: 'ty', color: '#d97706', bg: '#fef3c7' },
  { name: '血河', file: 'xh', color: '#e11d48', bg: '#ffe4e6' },
  { name: '九靈', file: 'jl', color: '#8b5cf6', bg: '#f3e8ff' },
  { name: '神相', file: 'sx', color: '#6366f1', bg: '#e0e7ff' },
  { name: '碎夢', file: 'sm', color: '#06b6d4', bg: '#cffaff' },
  { name: '素問', file: 'sw', color: '#f43f5e', bg: '#ffe4e6' },
  { name: '龍吟', file: 'ly', color: '#10b981', bg: '#d1fae5' },
  { name: '玄機', file: 'xj', color: '#84cc16', bg: '#ecfccb' },
  { name: '潮光', file: 'cg', color: '#38bdf8', bg: '#f0f9ff' },
  { name: '滄瀾', file: 'cl', color: '#0284c7', bg: '#e0e7ff' }
])

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../assets/schools/${fileName}.png`, import.meta.url).href
}

// 成員列表資料
const members = ref([
  { id: 1, name: '行優', formerNames: [], schools: ['鐵衣', '九靈'], currentSchool: '鐵衣', hasGodlyWeapon: false, guild: '百錵谷酒池肉林', status: '學徒', contact: '行優#1234', notes: '主力坦克', tether: '', attendance: 12, leave: 0, rolePref: '禦' },
  { id: 2, name: '錵小錵', formerNames: [], schools: ['九靈', '碎夢'], currentSchool: '九靈', hasGodlyWeapon: true, guild: '百錵谷酒池肉林', status: '幫眾', contact: '', notes: '', tether: '', attendance: 15, leave: 1, rolePref: '' },
  { id: 3, name: '章小燒', formerNames: [], schools: ['血河'], currentSchool: '血河', hasGodlyWeapon: false, guild: '百錵谷酒池肉林', status: '幫眾', contact: '', notes: '', tether: '', attendance: 10, leave: 0, rolePref: '' },
  { id: 4, name: '夜小夜', formerNames: [], schools: ['素問', '玄機'], currentSchool: '素問', hasGodlyWeapon: false, guild: '百錵谷酒池肉林', status: '幫眾', contact: '', notes: '', tether: '', attendance: 8, leave: 0, rolePref: '' }
])

const searchQuery = ref('')
const selectedMemberIds = ref([])

// 表格列控制
const showColumnModal = ref(false)
const columnList = [
  { key: 'school', label: '流派' },
  { key: 'status', label: '幫眾狀態' },
  { key: 'godlyWeapon', label: '神兵' },
  { key: 'attendance', label: '出勤' },
  { key: 'leave', label: '請假' },
  { key: 'rolePref', label: '職能偏好' },
  { key: 'notes', label: '成員備註' },
  { key: 'contact', label: '聯繫方式' }
]
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

// 成員表單
const showMemberModal = ref(false)
const showFormerNamesModal = ref(false)
const editingMemberId = ref(null)

const memberForm = ref({
  name: '',
  formerNames: [],
  schools: [],
  currentSchool: '',
  hasGodlyWeapon: false,
  guild: '百錵谷酒池肉林',
  status: '幫眾',
  contact: '',
  notes: '',
  tether: '',
  rolePref: '未設置'
})

// 截圖與批量
const showImportModal = ref(false)
const importTargetGuild = ref('百錵谷酒池肉林')
const fileInput = ref(null)
const ocrPreviewList = ref([])

const showBatchModal = ref(false)
const batchTargetGuild = ref('百錵谷酒池肉林')

// 依幫會篩選
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

const getSchoolInfo = (schoolName) => {
  const found = availableSchools.value.find(s => s.name === schoolName)
  return found || { name: schoolName, file: '', color: '#64748b', bg: '#f1f5f9' }
}

const openEditGuildModal = (guild) => {
  targetEditGuild.value = guild
  editingGuildName.value = guild.name
  showGuildEditModal.value = true
}

const saveGuildName = () => {
  if (targetEditGuild.value && editingGuildName.value.trim()) {
    const oldName = targetEditGuild.value.name
    const newName = editingGuildName.value.trim()
    targetEditGuild.value.name = newName

    members.value.forEach(m => {
      if (m.guild === oldName) m.guild = newName
    })

    showGuildEditModal.value = false
  }
}

const deleteGuild = () => {
  if (confirm(`確定要移除幫會【${targetEditGuild.value.name}】嗎？該幫會的成員將移至【未分配】。`)) {
    const targetName = targetEditGuild.value.name
    members.value.forEach(m => {
      if (m.guild === targetName) m.guild = '未分配'
    })
    guildList.value = guildList.value.filter(g => g.id !== targetEditGuild.value.id)
    currentGuildId.value = guildList.value[0]?.id || 1
    showGuildEditModal.value = false
  }
}

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

const getStatusClass = (status) => {
  if (status === '幫眾') return 'status-green'
  if (status === '學徒') return 'status-blue'
  return 'status-gray'
}

const openAddGuildModal = () => {
  const name = prompt('請輸入新幫會名稱：')
  if (name && name.trim()) {
    guildList.value.push({ id: Date.now(), name: name.trim() })
  }
}

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

  if (memberForm.value.schools.length > 0) {
    memberForm.value.currentSchool = memberForm.value.schools[0]
  } else {
    memberForm.value.currentSchool = ''
  }
}

const handleAddSchool = () => {
  const name = prompt('請輸入新增的流派/職業名稱：')
  if (name && name.trim()) {
    availableSchools.value.push({
      name: name.trim(),
      file: '',
      color: '#3b82f6',
      bg: '#eff6ff',
      isCustom: true
    })
  }
}

const deleteSchool = (schoolName) => {
  if (confirm(`確定要刪除流派【${schoolName}】嗎？`)) {
    availableSchools.value = availableSchools.value.filter(s => s.name !== schoolName)
  }
}

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

const triggerFileUpload = () => {
  fileInput.value.click()
}

const handleScreenshotUpload = (e) => {
  const file = e.target.files[0]
  if (!file) return

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
    if (user.role) role.value = user.role
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

/* 左側幫會 */
.guild-sidebar { width: 220px; background: #ffffff; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sidebar-header h3 { margin: 0; font-size: 15px; }
.btn-add-guild { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; font-weight: bold; }
.guild-list { list-style: none; padding: 0; margin: 0; }
.guild-item { padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; transition: background 0.2s; }
.guild-item.active, .guild-item:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }
.guild-info { display: flex; justify-content: space-between; width: 100%; align-items: center; }
.guild-count { font-size: 11px; opacity: 0.6; }
.guild-actions { display: none; }
.guild-item:hover .guild-actions { display: block; }
.btn-icon-sm { background: none; border: none; color: #64748b; cursor: pointer; font-size: 14px; padding: 2px; }
.btn-icon-sm:hover { color: #2563eb; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.toolbar { display: flex; justify-content: space-between; margin-bottom: 15px; }
.left-actions { display: flex; gap: 10px; align-items: center; }
.search-input { padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-danger { background: #ef4444; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-icon { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 16px; }

/* 表格欄位與 PopOver 快切選單 */
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; position: relative; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

.school-popover-wrapper, .status-popover-wrapper { position: relative; display: inline-block; }
.school-cell.clickable { cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px; border-radius: 6px; transition: background 0.2s; }
.school-cell.clickable:hover { background: #f1f5f9; }
.school-img-badge { width: 24px; height: 24px; object-fit: contain; }
.school-text-badge { background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 11px; }

/* 狀態標籤與快切 */
.status-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; display: inline-block; }
.status-badge.clickable { cursor: pointer; transition: transform 0.15s; }
.status-badge.clickable:hover { transform: scale(1.08); }
.status-green { background: #dcfce7; color: #16a34a; }
.status-blue { background: #e0e7ff; color: #4338ca; }
.status-gray { background: #f1f5f9; color: #64748b; }

/* 氣泡選單 PopOver */
.school-popover-box, .status-popover-box {
  position: absolute;
  bottom: 115%;
  left: 50%;
  transform: translateX(-50%);
  background: #ffffff;
  border-radius: 12px;
  padding: 8px 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  display: flex;
  gap: 8px;
  z-index: 100;
  white-space: nowrap;
}
.popover-arrow {
  position: absolute;
  bottom: -4px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 8px;
  height: 8px;
  background: #ffffff;
}
.popover-school-btn {
  border: 1px solid #cbd5e1;
  background: #ffffff;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: #475569;
  transition: all 0.2s;
}
.popover-school-btn.active {
  border-color: #3b82f6;
  background: #eff6ff;
  color: #2563eb;
  font-weight: bold;
  box-shadow: 0 0 0 1px #3b82f6;
}
.popover-btn-img { width: 16px; height: 16px; object-fit: contain; }

.popover-status-btn {
  border: 1px solid transparent;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}
.popover-status-btn.active {
  box-shadow: 0 0 0 2px #3b82f6;
  font-weight: bold;
}

.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }

/* 表格列設置彈窗 */
.column-hint-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-size: 12px; color: #64748b; margin-bottom: 15px; }
.column-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #f1f5f9; }
.column-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #334155; }
.drag-handle { color: #94a3b8; font-weight: bold; cursor: grab; }

/* 流派按鈕選單 */
.school-selector { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; align-items: center; }
.school-btn-card { border: 1px solid #cbd5e1; background: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; position: relative; }
.school-btn-card.active { border-color: var(--badge-color); background: var(--badge-bg); color: var(--badge-color); font-weight: bold; }
.btn-img-icon { width: 18px; height: 18px; object-fit: contain; }
.btn-add-school { border: 1px dashed #3b82f6; background: #eff6ff; color: #3b82f6; padding: 4px 10px; border-radius: 20px; font-size: 12px; cursor: pointer; }
.del-school-x { margin-left: 4px; color: #ef4444; font-weight: bold; cursor: pointer; }

/* 彈窗基礎 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; max-height: 85vh; overflow-y: auto; }
.small-card { width: 380px; }
.medium-card { width: 500px; }
.large-card { width: 680px; }
.wide-card { width: 720px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row label { width: 100px; font-weight: bold; }
.form-row input[type="text"], .form-row select { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
.req { color: #ef4444; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.margin-t { margin-top: 10px; }
.margin-v { margin: 10px 0; }
.full-width { width: 100%; }

.upload-box { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: #f8fafc; margin-top: 10px; }
.upload-icon { font-size: 32px; color: #94a3b8; }
.ocr-result-box { margin-top: 15px; background: #f1f5f9; padding: 10px; border-radius: 6px; font-size: 12px; }
</style>