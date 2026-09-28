<template>
  <div class="roster-board-layout">
    <!-- 頂部頁籤與引導 -->
    <div class="roster-header-bar">
      <div class="header-left-info">
        <button class="btn-back-link" @click="$emit('back')">&lt; 返回聯賽列表</button>
        <span class="league-title-tag">{{ leagueInfo.title }}</span>
        <span class="league-type-tag">{{ leagueInfo.type }}</span>
        <span class="league-time-text">{{ leagueInfo.startTime }}</span>
      </div>

      <div class="header-right-actions">
        <button class="btn-export">導出圖片 <i class="mdi mdi-chevron-down"></i></button>
      </div>
    </div>

    <div class="roster-main-container">
      
      <!-- ================= 左側：待選成員區塊 (圖一 & 圖二) ================= -->
      <aside class="pending-sidebar">
        <!-- 幫會切換與資訊 -->
        <div class="guild-select-box">
          <span class="guild-name-display">{{ guildName }}</span>
        </div>

        <!-- 搜尋與篩選列 -->
        <div class="pending-filter-bar">
          <div class="pending-title-group">
            <span class="pending-title">待選成員</span>
            <button class="btn-icon-add" @click="openAddMemberModal" title="新增成員">+</button>
          </div>

          <input 
            type="text" 
            v-model="searchMemberQuery" 
            placeholder="輸入名字查詢成員" 
            class="pending-search-input" 
          />
        </div>

        <!-- 流派 Icon 快篩列 (已排除鴻音) -->
        <div class="school-icon-filter-row">
          <div 
            v-for="s in availableSchools" 
            :key="s.name"
            :class="['icon-filter-item', { active: activeSchoolFilter === s.name }]"
            @click="toggleSchoolFilter(s.name)"
            :title="s.name"
          >
            <img :src="getSchoolImg(s.file)" class="school-filter-img" />
          </div>
        </div>

        <!-- 按流派分類的待選成員列表 (圖二) -->
        <div class="school-accordion-list">
          <div 
            v-for="s in filteredSchoolAccordion" 
            :key="s.name" 
            class="accordion-item"
          >
            <!-- 流派標頭 -->
            <div class="accordion-head" @click="toggleAccordion(s.name)">
              <div class="accordion-head-left">
                <img :src="getSchoolImg(s.file)" class="accordion-school-img" />
                <span class="accordion-school-name">{{ s.name }}</span>
                <span class="accordion-count">({{ getUnassignedCountBySchool(s.name) }})</span>
              </div>
              <i :class="['mdi', expandedSchools.includes(s.name) ? 'mdi-chevron-down' : 'mdi-chevron-right', 'accordion-arrow']"></i>
            </div>

            <!-- 成員卡片清單 (支援拖拽進右側陣列) -->
            <div v-if="expandedSchools.includes(s.name)" class="accordion-body">
              <div 
                v-for="m in getUnassignedMembersBySchool(s.name)" 
                :key="m.id"
                class="member-drag-card"
                draggable="true"
                @dragstart="onDragStartMember(m)"
                @click="openMemberEditModal(m)"
              >
                <img :src="getSchoolImg(s.file)" class="drag-card-icon" />
                <span class="drag-card-name">{{ m.name }}</span>
              </div>

              <div v-if="getUnassignedMembersBySchool(s.name).length === 0" class="empty-sub-text">
                無待選成員
              </div>
            </div>
          </div>
        </div>
      </aside>

      <!-- ================= 右側：團隊矩陣排表區塊 (圖一 & 圖七 & 圖八) ================= -->
      <main class="matrix-content-area">
        <!-- 團隊工具列 -->
        <div class="matrix-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-section-title">團隊配置</span>
            <button class="btn-secondary-sm" @click="saveRosterBoard">保存陣容</button>

            <!-- 其他操作下拉 -->
            <div class="custom-dropdown-wrapper" @click.stop>
              <button class="btn-secondary-sm" @click="showOtherOpsDropdown = !showTimePicker">
                其他操作 <i class="mdi mdi-chevron-down"></i>
              </button>
              <div v-if="showOtherOpsDropdown" class="ops-dropdown-menu">
                <div class="ops-item" @click="openBatchEditModal">批量編輯</div>
                <div class="ops-item text-red" @click="confirmClearRoster">清空陣容</div>
              </div>
            </div>
          </div>

          <!-- 選擇陣容模板下拉 (圖一 & 圖七) -->
          <div class="toolbar-right">
            <span class="template-select-label">團隊排表</span>
            <div class="custom-select-wrapper" @click.stop>
              <div class="custom-select-input" @click="showTemplateDropdown = !showTimePicker">
                <span>{{ appliedTemplateName || '選擇陣容模板' }}</span>
                <i class="mdi mdi-chevron-down select-arrow"></i>
              </div>
              <div v-if="showTemplateDropdown" class="custom-select-dropdown">
                <div 
                  v-for="tpl in templateOptions" 
                  :key="tpl.id" 
                  class="dropdown-item"
                  @click="applyRosterTemplate(tpl)"
                >
                  {{ tpl.name }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 團隊矩陣 (Teams -> Squads -> Slots) -->
        <div class="teams-matrix-wrapper">
          <div v-for="(team, tIdx) in matrixTeams" :key="team.id" class="team-matrix-row">
            <div class="team-row-title">{{ team.name }}</div>

            <div class="squads-matrix-grid">
              <div v-for="(squad, sIdx) in team.squads" :key="squad.id" class="squad-column-box">
                <div class="squad-column-head">
                  {{ squad.name }} <template v-if="squad.zhineng">- {{ squad.zhineng }}</template>
                </div>

                <div class="slots-vertical-list">
                  <div 
                    v-for="(slot, slotIdx) in squad.slots" 
                    :key="slot.id"
                    :class="[
                      'matrix-slot-card', 
                      { 
                        'has-member': slot.assignedMember, 
                        'template-guideline': !slot.assignedMember && slot.templateRole 
                      }
                    ]"
                    :style="getSlotStyle(slot)"
                    @dragover.prevent
                    @drop="onDropMemberToSlot(team, squad, slot)"
                    @click="clickSlot(team, squad, slot)"
                  >
                    <!-- 1. 已放置成員 (圖八) -->
                    <template v-if="slot.assignedMember">
                      <div class="assigned-slot-content">
                        <div class="member-head-info">
                          <img :src="getSchoolImgByName(slot.assignedMember.currentSchool)" class="slot-school-icon" />
                          <span class="slot-member-name">{{ slot.assignedMember.name }}</span>
                        </div>
                        <span class="slot-roles-text">{{ getSlotRoleSummary(slot) }}</span>
                      </div>
                    </template>

                    <!-- 2. 淺色預設模板指導 (圖七) -->
                    <template v-else-if="slot.templateRole">
                      <div class="template-guideline-content">
                        <span class="guideline-role-text">{{ slot.templateRole }}</span>
                      </div>
                    </template>

                    <!-- 3. 完全空白席位 -->
                    <template v-else>
                      <div class="empty-slot-placeholder">點擊/拖拽配置</div>
                    </template>

                    <span v-if="slot.assignedMember" class="slot-clear-x" @click.stop="removeMemberFromSlot(slot)">&times;</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>

    <!-- ================= 彈窗組件 ================= -->

    <!-- 1. 排表信息 Modal (點擊盤面上已放置成員時開起 - 圖四) -->
    <div v-if="showSlotInfoModal" class="modal-overlay" @click.self="showSlotInfoModal = false">
      <div class="modal-card slot-info-modal">
        <div class="modal-header">
          <h3>排表信息</h3>
          <div class="modal-header-actions">
            <button class="btn-link" @click="openMemberEditModal(activeSlotForModal?.assignedMember)">修改成員</button>
            <button class="btn-link text-red margin-l" @click="removeMemberFromSlot(activeSlotForModal)">移除席位</button>
            <span class="close-btn margin-l" @click="showSlotInfoModal = false">&times;</span>
          </div>
        </div>

        <div class="modal-body">
          <div class="slot-member-profile-card">
            <img :src="getSchoolImgByName(activeSlotForModal?.assignedMember?.currentSchool)" class="profile-school-img" />
            <div class="profile-text-group">
              <span class="profile-name">{{ activeSlotForModal?.assignedMember?.name }}</span>
              <span class="profile-school-tag">{{ activeSlotForModal?.assignedMember?.currentSchool }}</span>
            </div>
          </div>

          <div class="info-details-box margin-t">
            <div class="info-row">
              <span class="info-label">職能偏好：</span>
              <span class="info-val">{{ formatArrayText(activeSlotForModal?.assignedMember?.rolePreference) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">一線牽：</span>
              <span class="info-val">{{ activeSlotForModal?.assignedMember?.tether || '—' }}</span>
            </div>
          </div>

          <!-- 聯賽職能選擇 (17項個人職能) -->
          <div class="form-block margin-t">
            <div class="block-title">◆ 聯賽職能</div>
            <div class="role-pills-grid margin-t">
              <button 
                v-for="r in personalRoleOptions" 
                :key="r"
                :class="['role-pill-btn', { active: tempSlotRoles.includes(r) }]"
                @click="toggleTempSlotRole(r)"
              >
                {{ r }}
              </button>
            </div>
          </div>

          <!-- 配裝信息 (推薦技能) -->
          <div class="form-block margin-t">
            <div class="block-title">◆ 配裝信息</div>
            <div class="skill-input-row margin-t">
              <label>絕技：</label>
              <input type="text" v-model="tempSlotJueji" placeholder="輸入或選擇絕技" class="skill-field flex-1" />
            </div>
            <div class="skill-input-row margin-t">
              <label>群俠百家：</label>
              <input type="text" v-model="tempSlotQunxia" placeholder="輸入或選擇群俠百家" class="skill-field flex-1" />
            </div>
            <div class="skill-input-row margin-t">
              <label>裝備武蘊：</label>
              <input type="text" v-model="tempSlotZhuangbei" placeholder="輸入或選擇流派技能" class="skill-field flex-1" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showSlotInfoModal = false">取消</button>
          <button class="btn-primary" @click="saveSlotInfo">保存</button>
        </div>
      </div>
    </div>

    <!-- 2. 批量編輯成員職能與配裝 Modal (圖五) -->
    <div v-if="showBatchEditModal" class="modal-overlay" @click.self="showBatchEditModal = false">
      <div class="modal-card wide-card">
        <div class="modal-header">
          <h3>批量編輯成員職能與配裝</h3>
          <span class="close-btn" @click="showBatchEditModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="batch-toolbar-top">
            <span>已選 {{ selectedBatchMembers.length }} 人</span>
            <button class="btn-secondary-sm margin-l" @click="selectedBatchMembers = []">清空選擇</button>
          </div>

          <div class="batch-table-container margin-t">
            <div v-for="group in batchMemberGroups" :key="group.title" class="batch-group-block">
              <div class="batch-group-title">{{ group.title }}</div>
              <table class="batch-table">
                <thead>
                  <tr>
                    <th width="40"></th>
                    <th width="100">成員</th>
                    <th width="80">流派</th>
                    <th>職能</th>
                    <th>絕技</th>
                    <th>群俠百家</th>
                    <th>裝備武蘊</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="m in group.members" :key="m.slotId">
                    <td><input type="checkbox" :value="m.slotId" v-model="selectedBatchMembers" /></td>
                    <td class="font-bold">{{ m.name }}</td>
                    <td>{{ m.school }}</td>
                    <td><input type="text" v-model="m.roles" class="table-inline-input" /></td>
                    <td><input type="text" v-model="m.jueji" class="table-inline-input" /></td>
                    <td><input type="text" v-model="m.qunxia" class="table-inline-input" /></td>
                    <td><input type="text" v-model="m.zhuangbei" class="table-inline-input" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showBatchEditModal = false">取消</button>
          <button class="btn-primary" @click="saveBatchEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- 3. 美化置中確認 Modal (圖六) -->
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
          <button class="btn-primary btn-red" @click="executeConfirmAction">確定清空</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  leagueItem: {
    type: Object,
    default: () => ({
      title: '幫會聯賽',
      type: '幫會聯賽',
      startTime: '2026-10-10 20:00',
      guild: '百錵谷酒池肉林'
    })
  }
})

defineEmits(['back'])

const leagueInfo = computed(() => props.leagueItem)
const guildName = ref('百錵谷酒池肉林')

// 可選流派 (已完全排除鴻音)
const availableSchools = [
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
]

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  const found = availableSchools.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

const schoolColorMap = {
  '鐵衣': '#fef3c7',
  '血河': '#ffe4e6',
  '九靈': '#f3e8ff',
  '神相': '#e0e7ff',
  '碎夢': '#cffaff',
  '素問': '#ffe4e6',
  '龍吟': '#d1fae5',
  '玄機': '#ecfccb',
  '潮光': '#f0f9ff',
  '滄瀾': '#e0e7ff'
}

// 17 項個人職能
const personalRoleOptions = [
  'D潮拆塔', '保鏢拆', '埋頭猛拆', '塔仇主T', '增益絕', '奶絕', '指揮',
  '清泉人傷', '清泉保活', '灌大團', '點殺', '燒屍體', '破甲人傷',
  '純保鏢', '統戰', '騰龍保鏢', '騰龍合軸'
]

// 待選成員搜尋與流派快篩
const searchMemberQuery = ref('')
const activeSchoolFilter = ref(null)
const expandedSchools = ref(['潮光', '素問', '鐵衣', '血河'])

// 成員總庫
const allMembers = ref([
  { id: 101, name: '小羽月', currentSchool: '潮光', rolePreference: ['清泉保活', 'D潮拆塔'], tether: '落花輕舞', assigned: true },
  { id: 102, name: '落花輕舞', currentSchool: '潮光', rolePreference: ['保鏢拆', '埋頭猛拆'], tether: '小羽月', assigned: true },
  { id: 103, name: '行優', currentSchool: '鐵衣', rolePreference: ['塔仇主T'], tether: '', assigned: false },
  { id: 104, name: '銃銃', currentSchool: '九靈', rolePreference: ['灌大團'], tether: '', assigned: false },
  { id: 105, name: '章小燒', currentSchool: '血河', rolePreference: ['點殺'], tether: '', assigned: false },
  { id: 106, name: '夜小夜', currentSchool: '素問', rolePreference: ['奶絕', '清泉保活'], tether: '', assigned: false },
  { id: 107, name: '可愛影', currentSchool: '龍吟', rolePreference: ['破甲人傷'], tether: '', assigned: false },
  { id: 108, name: '飛雪', currentSchool: '血河', rolePreference: ['燒屍體'], tether: '', assigned: false },
  { id: 109, name: '聆玨', currentSchool: '素問', rolePreference: ['純保鏢'], tether: '', assigned: false }
])

const toggleSchoolFilter = (sName) => {
  activeSchoolFilter.value = activeSchoolFilter.value === sName ? null : sName
}

const toggleAccordion = (sName) => {
  const idx = expandedSchools.value.indexOf(sName)
  if (idx > -1) expandedSchools.value.splice(idx, 1)
  else expandedSchools.value.push(sName)
}

const filteredSchoolAccordion = computed(() => {
  if (activeSchoolFilter.value) {
    return availableSchools.filter(s => s.name === activeSchoolFilter.value)
  }
  return availableSchools
})

const getUnassignedMembersBySchool = (schoolName) => {
  return allMembers.value.filter(m => {
    const matchSchool = m.currentSchool === schoolName
    const notAssigned = !m.assigned
    const matchSearch = !searchMemberQuery.value || m.name.includes(searchMemberQuery.value.trim())
    return matchSchool && notAssigned && matchSearch
  })
}

const getUnassignedCountBySchool = (schoolName) => {
  return getUnassignedMembersBySchool(schoolName).length
}

// 團隊矩陣數據
const matrixTeams = ref([
  {
    id: 1,
    name: '進攻一團',
    squads: [
      { id: 11, name: '一隊', zhineng: '塔後隊', slots: createDefaultSlotsWithSample(1) },
      { id: 12, name: '二隊', zhineng: '保鏢隊', slots: createDefaultSlotsWithSample(2) },
      { id: 13, name: '三隊', zhineng: '塔前隊', slots: Array.from({ length: 6 }, () => ({ id: Math.random(), assignedMember: null, roles: ['塔仇主T'], jueji: '', qunxia: '', zhuangbei: '' })) },
      { id: 14, name: '四隊', zhineng: '', slots: Array.from({ length: 6 }, () => ({ id: Math.random(), assignedMember: null, roles: [], jueji: '', qunxia: '', zhuangbei: '' })) },
      { id: 15, name: '五隊', zhineng: '', slots: Array.from({ length: 6 }, () => ({ id: Math.random(), assignedMember: null, roles: [], jueji: '', qunxia: '', zhuangbei: '' })) }
    ]
  },
  {
    id: 2,
    name: '進攻二團',
    squads: Array.from({ length: 5 }, (_, i) => ({
      id: 20 + i,
      name: `${i + 1}隊`,
      zhineng: '',
      slots: Array.from({ length: 6 }, () => ({ id: Math.random(), assignedMember: null, roles: [], jueji: '', qunxia: '', zhuangbei: '' }))
    }))
  }
])

function createDefaultSlotsWithSample(type) {
  const slots = Array.from({ length: 6 }, () => ({
    id: Math.random(),
    assignedMember: null,
    roles: [],
    jueji: '',
    qunxia: '',
    zhuangbei: ''
  }))

  if (type === 1) {
    slots[0].assignedMember = allMembers.value[0] // 小羽月
    slots[0].roles = ['清泉保活', 'D潮拆塔']
    slots[0].templateRole = '統戰 / 指揮'
  } else if (type === 2) {
    slots[0].assignedMember = allMembers.value[1] // 落花輕舞
    slots[0].roles = ['保鏢拆', '埋頭猛拆']
    slots[0].templateRole = '騰龍保鏢'
  }
  return slots
}

// 拖拽與席位連動
let draggedMember = null

const onDragStartMember = (member) => {
  draggedMember = member
}

const onDropMemberToSlot = (team, squad, slot) => {
  if (!draggedMember) return
  if (slot.assignedMember) {
    slot.assignedMember.assigned = false
  }
  slot.assignedMember = draggedMember
  draggedMember.assigned = true
  draggedMember = null
}

const removeMemberFromSlot = (slot) => {
  if (slot && slot.assignedMember) {
    slot.assignedMember.assigned = false
    slot.assignedMember = null
  }
  showSlotInfoModal.value = false
}

const getSlotStyle = (slot) => {
  if (slot.assignedMember) {
    const bg = schoolColorMap[slot.assignedMember.currentSchool] || '#eff6ff'
    return { backgroundColor: bg }
  }
  return {}
}

const getSlotRoleSummary = (slot) => {
  if (slot.roles && slot.roles.length > 0) return slot.roles.join('、')
  return '點擊配置職能'
}

// 席位彈窗 (圖四)
const showSlotInfoModal = ref(false)
const activeSlotForModal = ref(null)
const tempSlotRoles = ref([])
const tempSlotJueji = ref('')
const tempSlotQunxia = ref('')
const tempSlotZhuangbei = ref('')

const clickSlot = (team, squad, slot) => {
  if (!slot.assignedMember) return
  activeSlotForModal.value = slot
  tempSlotRoles.value = [...(slot.roles || [])]
  tempSlotJueji.value = slot.jueji || ''
  tempSlotQunxia.value = slot.qunxia || ''
  tempSlotZhuangbei.value = slot.zhuangbei || ''
  showSlotInfoModal.value = true
}

const toggleTempSlotRole = (r) => {
  const idx = tempSlotRoles.value.indexOf(r)
  if (idx > -1) tempSlotRoles.value.splice(idx, 1)
  else tempSlotRoles.value.push(r)
}

const saveSlotInfo = () => {
  if (activeSlotForModal.value) {
    activeSlotForModal.value.roles = [...tempSlotRoles.value]
    activeSlotForModal.value.jueji = tempSlotJueji.value.trim()
    activeSlotForModal.value.qunxia = tempSlotQunxia.value.trim()
    activeSlotForModal.value.zhuangbei = tempSlotZhuangbei.value.trim()
  }
  showSlotInfoModal.value = false
}

// 批量編輯 Modal (圖五)
const showBatchEditModal = ref(false)
const selectedBatchMembers = ref([])
const batchMemberGroups = ref([])

const openBatchEditModal = () => {
  const groups = []
  matrixTeams.value.forEach(team => {
    team.squads.forEach(squad => {
      const assignedSlots = squad.slots.filter(s => s.assignedMember)
      if (assignedSlots.length > 0) {
        groups.push({
          title: `${team.name}--${squad.name}`,
          members: assignedSlots.map(s => ({
            slotId: s.id,
            name: s.assignedMember.name,
            school: s.assignedMember.currentSchool,
            roles: s.roles.join('、'),
            jueji: s.jueji || '',
            qunxia: s.qunxia || '',
            zhuangbei: s.zhuangbei || ''
          }))
        })
      }
    })
  })
  batchMemberGroups.value = groups
  showBatchEditModal.value = true
  showOtherOpsDropdown.value = false
}

const saveBatchEdit = () => {
  showBatchEditModal.value = false
}

// 置中清空陣容 Modal (圖六)
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const showOtherOpsDropdown = ref(false)

const confirmClearRoster = () => {
  showOtherOpsDropdown.value = false
  confirmTitle.value = '清空陣容'
  confirmMessage.value = '將清空本場全部排表，頁面會刷新；此操作不可撤銷。'
  showConfirmModal.value = true
}

const executeConfirmAction = () => {
  matrixTeams.value.forEach(team => {
    team.squads.forEach(squad => {
      squad.slots.forEach(slot => {
        if (slot.assignedMember) {
          slot.assignedMember.assigned = false
          slot.assignedMember = null
        }
      })
    })
  })
  showConfirmModal.value = false
}

// 選擇陣容模板 (圖一 & 圖七)
const showTemplateDropdown = ref(false)
const appliedTemplateName = ref('')

const templateOptions = [
  { id: 1, name: '甲組通用模板' },
  { id: 2, name: '乙組防守模板' }
]

const applyRosterTemplate = (tpl) => {
  appliedTemplateName.value = tpl.name
  showTemplateDropdown.value = false

  // 為空白席位填寫淺色引導
  matrixTeams.value[0].squads[0].slots.forEach(s => {
    if (!s.assignedMember) s.templateRole = '統戰 / 指揮'
  })
}

const formatArrayText = (arr) => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '—'
  return arr.join('、')
}

const saveRosterBoard = () => {
  alert('陣容保存成功！')
}

const openAddMemberModal = () => {
  alert('開啟新增成員視圖')
}

const openMemberEditModal = (member) => {
  if (member) alert(`開啟成員【${member.name}】數據編輯彈窗`)
}
</script>

<style scoped>
.roster-board-layout { display: flex; flex-direction: column; min-height: calc(100vh - 60px); background: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

/* 頂部 Header */
.roster-header-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; }
.header-left-info { display: flex; align-items: center; gap: 12px; }
.btn-back-link { background: none; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #475569; }
.league-title-tag { font-size: 16px; font-weight: bold; color: #1e293b; }
.league-type-tag { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.league-time-text { font-size: 12px; color: #64748b; }
.btn-export { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }

/* 主要內容容器 */
.roster-main-container { flex: 1; display: flex; gap: 16px; padding: 16px 20px; overflow: hidden; }

/* 左側待選成員側邊欄 */
.pending-sidebar { width: 230px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.guild-select-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; color: #1e293b; margin-bottom: 12px; }

.pending-filter-bar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.pending-title-group { display: flex; justify-content: space-between; align-items: center; }
.pending-title { font-weight: bold; font-size: 13px; color: #334155; }
.btn-icon-add { background: none; border: none; color: #3b82f6; font-size: 18px; font-weight: bold; cursor: pointer; }
.pending-search-input { width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box; }

/* 流派 Icon 快篩列 */
.school-icon-filter-row { display: flex; flex-wrap: wrap; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 8px; }
.icon-filter-item { width: 26px; height: 26px; border-radius: 4px; border: 1px solid transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.icon-filter-item.active, .icon-filter-item:hover { background: #eff6ff; border-color: #3b82f6; }
.school-filter-img { width: 18px; height: 18px; object-fit: contain; }

/* 手風琴列表 */
.school-accordion-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.accordion-item { border-bottom: 1px solid #f8fafc; }
.accordion-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; cursor: pointer; font-size: 12px; }
.accordion-head-left { display: flex; align-items: center; gap: 6px; font-weight: 500; }
.accordion-school-img { width: 16px; height: 16px; object-fit: contain; }
.accordion-count { color: #94a3b8; }
.accordion-arrow { font-size: 16px; color: #94a3b8; }

.accordion-body { padding: 4px 0 8px 10px; display: flex; flex-direction: column; gap: 4px; }
.member-drag-card { display: flex; align-items: center; gap: 6px; background: #f0f9ff; border: 1px solid #bae6fd; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: grab; color: #0369a1; transition: transform 0.15s; }
.member-drag-card:hover { transform: translateX(2px); }
.drag-card-icon { width: 16px; height: 16px; object-fit: contain; }
.empty-sub-text { font-size: 11px; color: #cbd5e1; padding: 4px 0; }

/* 右側矩陣內容區 */
.matrix-content-area { flex: 1; display: flex; flex-direction: column; gap: 12px; overflow-x: auto; }
.matrix-toolbar { display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 10px; }
.toolbar-section-title { font-size: 14px; font-weight: bold; color: #1e293b; }

.btn-secondary-sm { background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #334155; }
.template-select-label { font-size: 12px; color: #64748b; font-weight: bold; }

.custom-dropdown-wrapper { position: relative; }
.ops-dropdown-menu { position: absolute; top: 100%; left: 0; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 100px; z-index: 100; }
.ops-item { padding: 8px 12px; font-size: 12px; cursor: pointer; }
.ops-item:hover { background: #f1f5f9; }

/* 下拉選單 */
.custom-select-wrapper { position: relative; width: 160px; }
.custom-select-input { display: flex; align-items: center; justify-content: space-between; padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; }
.custom-select-dropdown { position: absolute; top: 100%; right: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; }
.dropdown-item { padding: 8px 12px; font-size: 12px; cursor: pointer; }
.dropdown-item:hover { background: #f1f5f9; }

/* 團隊矩陣橫列 (圖一 & 圖八) */
.teams-matrix-wrapper { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.team-matrix-row { background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px; }
.team-row-title { font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 10px; }

.squads-matrix-grid { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 10px; }
.squad-column-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }
.squad-column-head { font-size: 12px; font-weight: bold; color: #475569; margin-bottom: 8px; text-align: center; }

.slots-vertical-list { display: flex; flex-direction: column; gap: 6px; }
.matrix-slot-card { position: relative; height: 38px; border-radius: 4px; border: 1px dashed #cbd5e1; background: #ffffff; display: flex; align-items: center; padding: 0 8px; cursor: pointer; transition: all 0.15s; }
.matrix-slot-card:hover { border-color: #3b82f6; }

.matrix-slot-card.has-member { border: 1px solid #cbd5e1; }
.assigned-slot-content { display: flex; flex-direction: column; width: 100%; }
.member-head-info { display: flex; align-items: center; gap: 4px; }
.slot-school-icon { width: 16px; height: 16px; object-fit: contain; }
.slot-member-name { font-size: 12px; font-weight: bold; color: #1e293b; }
.slot-roles-text { font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 淺色預設模板指導 (圖七) */
.matrix-slot-card.template-guideline { background: #fafafa; border: 1px solid #f1f5f9; }
.template-guideline-content { font-size: 10px; color: #94a3b8; }
.empty-slot-placeholder { font-size: 10px; color: #cbd5e1; width: 100%; text-align: center; }

.slot-clear-x { position: absolute; right: 4px; top: 2px; font-size: 12px; color: #94a3b8; cursor: pointer; opacity: 0; }
.matrix-slot-card:hover .slot-clear-x { opacity: 1; }
.slot-clear-x:hover { color: #ef4444; }

/* Modal 樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.slot-info-modal { width: 500px; max-height: 85vh; overflow-y: auto; }
.wide-card { width: 780px; max-height: 85vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.modal-header-actions { display: flex; align-items: center; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }

.slot-member-profile-card { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
.profile-school-img { width: 32px; height: 32px; object-fit: contain; }
.profile-name { font-size: 15px; font-weight: bold; color: #1e293b; }
.profile-school-tag { background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; }

.info-details-box { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #64748b; }
.info-label { font-weight: bold; width: 80px; display: inline-block; }

.form-block { display: flex; flex-direction: column; gap: 8px; }
.block-title { font-size: 13px; font-weight: bold; color: #1e293b; }
.role-pills-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.role-pill-btn { border: 1px solid #cbd5e1; background: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; color: #475569; }
.role-pill-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; font-weight: bold; }

.skill-input-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.skill-input-row label { width: 80px; font-weight: bold; }
.skill-field { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }

/* 批量編輯 Modal (圖五) */
.batch-toolbar-top { display: flex; align-items: center; font-size: 13px; font-weight: bold; }
.batch-table-container { display: flex; flex-direction: column; gap: 16px; }
.batch-group-block { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
.batch-group-title { background: #f8fafc; padding: 6px 12px; font-size: 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0; }
.batch-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.batch-table th, .batch-table td { padding: 8px; border-bottom: 1px solid #f1f5f9; text-align: left; }
.batch-table th { background: #ffffff; color: #64748b; }
.table-inline-input { width: 100%; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; box-sizing: border-box; }

/* 置中刪除確認 Modal */
.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-primary.btn-red { background: #ef4444; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; padding: 0; }
.text-red { color: #ef4444; }
.font-bold { font-weight: bold; }
.flex-1 { flex: 1; }
.margin-l { margin-left: 10px; }
.margin-t { margin-top: 12px; }
</style>