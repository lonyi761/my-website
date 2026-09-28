<template>
  <div :class="['members-layout', isDarkMode ? 'dark-theme' : 'light-theme']" @click="closePopover">
    <!-- 頂部導航列 -->
    <header class="navbar">
      <div class="nav-left">
        <span class="brand-logo">行優聯賽系統</span>
      </div>

      <nav class="nav-center">
        <router-link to="/home">首頁</router-link>
        <router-link to="/members" class="active">成員</router-link>
        <router-link to="/league">聯賽</router-link>
        <router-link to="/preparation">戰備</router-link>
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

                <!-- 流派快切選單 -->
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

                <!-- 幫眾狀態快切選單 -->
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
                <td v-if="columns.rolePref">{{ member.rolePref || '未設置' }}</td>
                <td v-if="columns.notes">{{ member.notes || '—' }}</td>
                <td v-if="columns.contact">{{ member.contact || '—' }}</td>
                <td>
                  <button class="btn-link" @click="openMemberModal(member)">編輯</button>
                  <button class="btn-link text-red" @click="deleteMember(member.id)">刪除</button>
                </td>
              </tr>
              <tr v-if="filteredMembers.length === 0">
                <td :colspan="10" class="empty-cell">暫無成員資料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
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

            <!-- 職能偏好：結合戰備 17 項個人職能的可下拉多選選單 -->
            <div class="form-row align-start">
              <label>職能偏好：</label>
              <div class="custom-select-wrapper" @click.stop>
                <div 
                  class="custom-select-input" 
                  @click="showRoleDropdown = !showRoleDropdown"
                >
                  <span :class="{ 'placeholder-text': !memberForm.rolePrefList || memberForm.rolePrefList.length === 0 }">
                    {{ displayRolePref }}
                  </span>
                  <i :class="['mdi', 'mdi-chevron-down', 'select-arrow', { rotate: showRoleDropdown }]"></i>
                </div>

                <div v-if="showRoleDropdown" class="custom-select-dropdown">
                  <div 
                    v-for="roleName in personalRoleOptions" 
                    :key="roleName" 
                    :class="['dropdown-option-item', { selected: isRoleSelected(roleName) }]"
                    @click="toggleRolePref(roleName)"
                  >
                    <span>{{ roleName }}</span>
                    <i v-if="isRoleSelected(roleName)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showMemberModal = false">取消</button>
          <button class="btn-primary" @click="saveMember">提交</button>
        </div>
      </div>
    </div>

    <!-- 置中刪除確認 Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-card confirm-modal-card">
        <div class="confirm-modal-body">
          <div class="warning-icon-wrapper">
            <i class="mdi mdi-alert-circle warning-icon"></i>
          </div>
          <h3 class="confirm-title">{{ confirmTitle }}</h3>
          <p class="confirm-msg">{{ confirmMessage }}</p>
        </div>
        <div class="confirm-modal-footer">
          <button class="btn-secondary" @click="showConfirmModal = false">取消</button>
          <button class="btn-primary btn-red" @click="executeConfirmAction">確定刪除</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../utils/supabase'

const router = useRouter()
const isDarkMode = ref(false)
const showMenu = ref(false)
const username = ref('VIP')
const userProfile = ref(null)

const activePopoverMemberId = ref(null)
const activeStatusPopoverMemberId = ref(null)

const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmActionCallback = null

const triggerConfirmModal = (title, message, onConfirm) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmActionCallback = onConfirm
  showConfirmModal.value = true
}

const executeConfirmAction = () => {
  if (confirmActionCallback) confirmActionCallback()
  showConfirmModal.value = false
}

const personalRoleOptions = [
  'D潮拆塔', '保鏢拆', '埋頭猛拆', '塔仇主T', '增益絕', '奶絕', '指揮',
  '清泉人傷', '清泉保活', '灌大團', '點殺', '燒屍體', '破甲人傷',
  '純保鏢', '統戰', '騰龍保鏢', '騰龍合軸'
]

const showRoleDropdown = ref(false)

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
  showRoleDropdown.value = false
}

// 幫會與成員列表 (雲端拉取)
const guildList = ref([
  { id: 1, name: '百錵谷酒池肉林' },
  { id: 2, name: '未分配' }
])
const currentGuildId = ref(1)
const showGuildEditModal = ref(false)
const targetEditGuild = ref(null)
const editingGuildName = ref('')

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

const members = ref([])
const searchQuery = ref('')
const selectedMemberIds = ref([])

const columns = ref({
  school: true,
  status: true,
  godlyWeapon: true,
  rolePref: true,
  notes: true,
  contact: true
})

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
  rolePref: '未設置',
  rolePrefList: []
})

// ★ Supabase 雲端資料讀取邏輯 ★
const fetchCloudData = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    router.push('/login')
    return
  }

  // 拉取使用者 Profile 屬性與幫會
  const { data: profile } = await supabase
    .from('profiles')
    .select('*, guilds(*)')
    .eq('id', session.user.id)
    .single()

  if (profile) {
    userProfile.value = profile
    username.value = session.user.email.split('@')[0]
  }

  // 1. 拉取 Supabase 幫會表
  const { data: guildsData } = await supabase.from('guilds').select('*')
  if (guildsData && guildsData.length > 0) {
    guildList.value = guildsData
    if (profile?.guild_id) {
      const found = guildsData.find(g => g.id === profile.guild_id)
      if (found) currentGuildId.value = found.id
    }
  }

  // 2. 拉取 Supabase 成員資料表
  const { data: membersData } = await supabase.from('guild_members').select('*')
  if (membersData) {
    members.value = membersData.map(m => ({
      id: m.id,
      name: m.name,
      formerNames: m.former_names || [],
      schools: m.schools || [m.current_school],
      currentSchool: m.current_school,
      hasGodlyWeapon: m.has_godly_weapon || false,
      guild: getGuildNameById(m.guild_id),
      status: m.status || '幫眾',
      contact: m.contact || '',
      notes: m.notes || '',
      tether: m.tether || '',
      rolePref: (m.role_preference && m.role_preference.length > 0) ? m.role_preference.join(', ') : '未設置',
      rolePrefList: m.role_preference || []
    }))
  }
}

const getGuildNameById = (guildId) => {
  const found = guildList.value.find(g => g.id === guildId)
  return found ? found.name : '未分配'
}

const getGuildIdByName = (guildName) => {
  const found = guildList.value.find(g => g.name === guildName)
  return found ? found.id : userProfile.value?.guild_id
}

// 快速切換流派並寫入 DB
const quickSwitchSchool = async (member, schoolName) => {
  member.currentSchool = schoolName
  activePopoverMemberId.value = null
  await supabase
    .from('guild_members')
    .update({ current_school: schoolName })
    .eq('id', member.id)
}

// 快速切換幫眾狀態並寫入 DB
const quickSwitchStatus = async (member, status) => {
  member.status = status
  activeStatusPopoverMemberId.value = null
  await supabase
    .from('guild_members')
    .update({ status: status })
    .eq('id', member.id)
}

// 寫入 / 更新成員 (Supabase)
const saveMember = async () => {
  if (!memberForm.value.name.trim()) return alert('請輸入角色名！')
  if (memberForm.value.schools.length === 0) return alert('請至少選擇一個流派！')

  const targetGuildId = getGuildIdByName(memberForm.value.guild)

  const payload = {
    guild_id: targetGuildId,
    name: memberForm.value.name.trim(),
    former_names: memberForm.value.formerNames,
    schools: memberForm.value.schools,
    current_school: memberForm.value.currentSchool,
    has_godly_weapon: memberForm.value.hasGodlyWeapon,
    status: memberForm.value.status,
    contact: memberForm.value.contact.trim(),
    notes: memberForm.value.notes.trim(),
    tether: memberForm.value.tether.trim(),
    role_preference: memberForm.value.rolePrefList
  }

  if (editingMemberId.value) {
    await supabase.from('guild_members').update(payload).eq('id', editingMemberId.value)
  } else {
    await supabase.from('guild_members').insert([payload])
  }

  await fetchCloudData()
  showMemberModal.value = false
}

// 刪除成員 (Supabase)
const deleteMember = (id) => {
  const m = members.value.find(item => item.id === id)
  triggerConfirmModal(
    '刪除成員',
    `確定要刪除成員【${m?.name || ''}】嗎？刪除後無法恢復。`,
    async () => {
      await supabase.from('guild_members').delete().eq('id', id)
      await fetchCloudData()
    }
  )
}

const displayRolePref = computed(() => {
  const list = memberForm.value.rolePrefList
  if (!list || list.length === 0) return '未設置 (可多選)'
  return list.join(', ')
})

const isRoleSelected = (roleName) => {
  return memberForm.value.rolePrefList && memberForm.value.rolePrefList.includes(roleName)
}

const toggleRolePref = (roleName) => {
  if (!memberForm.value.rolePrefList) memberForm.value.rolePrefList = []
  const idx = memberForm.value.rolePrefList.indexOf(roleName)
  if (idx > -1) memberForm.value.rolePrefList.splice(idx, 1)
  else memberForm.value.rolePrefList.push(roleName)
}

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

const openAddGuildModal = async () => {
  const name = prompt('請輸入新幫會名稱：')
  if (name && name.trim()) {
    await supabase.from('guilds').insert([{ name: name.trim() }])
    await fetchCloudData()
  }
}

const openMemberModal = (member = null) => {
  showRoleDropdown.value = false
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
      rolePref: '未設置',
      rolePrefList: []
    }
  }
  showMemberModal.value = true
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
  memberForm.value.currentSchool = memberForm.value.schools[0] || ''
}

const getStatusClass = (status) => {
  if (status === '幫眾') return 'status-green'
  if (status === '學徒') return 'status-blue'
  return 'status-gray'
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/login')
}

onMounted(fetchCloudData)
</script>

<style scoped>
.members-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.light-theme { background-color: #f4f6f9; color: #2c3e50; }
.dark-theme { background-color: #121824; color: #e2e8f0; }

.navbar { height: 55px; padding: 0 30px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.brand-logo { font-size: 16px; font-weight: bold; letter-spacing: 1px; }
.nav-center a { margin: 0 15px; text-decoration: none; color: inherit; opacity: 0.7; font-size: 14px; }
.nav-center a.active { opacity: 1; font-weight: 600; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
.user-dropdown { position: relative; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px; }

.members-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }
.guild-sidebar { width: 220px; background: #ffffff; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.btn-add-guild { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; font-weight: bold; }
.guild-list { list-style: none; padding: 0; margin: 0; }
.guild-item { padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.guild-item.active, .guild-item:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.toolbar { display: flex; justify-content: space-between; margin-bottom: 15px; }
.left-actions { display: flex; gap: 10px; align-items: center; }
.search-input { padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; position: relative; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

.status-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; display: inline-block; cursor: pointer; }
.status-green { background: #dcfce7; color: #16a34a; }
.status-blue { background: #e0e7ff; color: #4338ca; }
.status-gray { background: #f1f5f9; color: #64748b; }

.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; max-height: 85vh; overflow-y: auto; }
.large-card { width: 680px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row label { width: 100px; font-weight: bold; }
.form-row input[type="text"], .form-row select { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }

.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }
</style>