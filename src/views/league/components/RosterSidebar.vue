<template>
  <aside class="pending-sidebar">
    <!-- 幫會資訊 -->
    <div class="guild-select-box">
      <span class="guild-name-display">{{ guildName || '百錵谷酒池肉林' }}</span>
    </div>

    <!-- 搜尋與標題列 -->
    <div class="pending-filter-bar">
      <div class="pending-title-group">
        <div class="title-left-box">
          <span class="pending-title">待選成員</span>
          <button class="btn-icon-add" @click="$emit('open-add-member')" title="新增成員">+</button>
        </div>

        <!-- 流派 / 全員 切換按鈕 -->
        <div class="pending-mode-toggle">
          <button 
            :class="['mode-pill-btn', { active: pendingViewMode === 'school' }]" 
            @click="pendingViewMode = 'school'"
          >
            流派
          </button>
          <button 
            :class="['mode-pill-btn', { active: pendingViewMode === 'all' }]" 
            @click="pendingViewMode = 'all'"
          >
            全員
          </button>
        </div>
      </div>

      <input 
        type="text" 
        v-model="searchMemberQuery" 
        placeholder="輸入名字查詢成員" 
        class="pending-search-input" 
      />
    </div>

    <!-- 流派 Icon 快篩列 -->
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

    <!-- 1. 按流派分類的手風琴列表 (流派模式) -->
    <div v-if="pendingViewMode === 'school'" class="school-accordion-list">
      <div 
        v-for="s in filteredSchoolAccordion" 
        :key="s.name" 
        class="accordion-item"
      >
        <div class="accordion-head" @click="toggleAccordion(s.name)">
          <div class="accordion-head-left">
            <img :src="getSchoolImg(s.file)" class="accordion-school-img" />
            <span class="accordion-school-name">{{ s.name }}</span>
            <span class="accordion-count">({{ getUnassignedCountBySchool(s.name) }})</span>
          </div>
          <i :class="['mdi', expandedSchools.includes(s.name) ? 'mdi-chevron-down' : 'mdi-chevron-right', 'accordion-arrow']"></i>
        </div>

        <!-- 流派折疊區域 (點擊展開) -->
        <div v-if="expandedSchools.includes(s.name)" class="accordion-body">
          <div 
            v-for="m in getUnassignedMembersBySchool(s.name)" 
            :key="m.id + '_' + s.name"
            class="member-drag-card"
            draggable="true"
            @dragstart="$emit('drag-start-member', m)"
            @click="$emit('open-edit-member', m)"
            title="按住拖拽至排表，或點擊編輯成員資料"
          >
            <div class="drag-card-icons-group">
              <img :src="getSchoolImgByName(m.currentSchool)" class="drag-card-icon" />
              <img 
                v-if="getSecondarySchool(m)" 
                :src="getSchoolImgByName(getSecondarySchool(m))" 
                class="drag-card-icon-sub" 
                title="副職業"
              />
            </div>
            <span class="drag-card-name">{{ m.name }}</span>
          </div>

          <div v-if="getUnassignedMembersBySchool(s.name).length === 0" class="empty-sub-text">
            無待選成員
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 一整排向下的全員清單 (全員模式) -->
    <div v-else-if="pendingViewMode === 'all'" class="all-members-flow-list">
      <div 
        v-for="m in allUnassignedMembersList" 
        :key="m.id"
        class="member-drag-card"
        draggable="true"
        @dragstart="$emit('drag-start-member', m)"
        @click="$emit('open-edit-member', m)"
        title="按住拖拽至排表，或點擊編輯成員資料"
      >
        <div class="drag-card-icons-group">
          <img :src="getSchoolImgByName(m.currentSchool)" class="drag-card-icon" />
          <img 
            v-if="getSecondarySchool(m)" 
            :src="getSchoolImgByName(getSecondarySchool(m))" 
            class="drag-card-icon-sub" 
            title="副職業"
          />
        </div>
        <span class="drag-card-name">{{ m.name }}</span>
      </div>

      <div v-if="allUnassignedMembersList.length === 0" class="empty-sub-text">
        無符合條件之待選成員
      </div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  guildName: String,
  allMembers: { type: Array, default: () => [] },
  availableSchools: { type: Array, default: () => [] },
  showSecondarySchool: Boolean
})

defineEmits(['open-add-member', 'open-edit-member', 'drag-start-member'])

const searchMemberQuery = ref('')
const activeSchoolFilter = ref(null)
const pendingViewMode = ref('school')

// 預設全部折疊/縮起 (空陣列)
const expandedSchools = ref([])

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  const found = props.availableSchools?.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

const getSecondarySchool = (member) => {
  if (!member || !member.schools || member.schools.length < 2) return ''
  return member.schools.find(s => s !== member.currentSchool) || ''
}

const toggleSchoolFilter = (sName) => {
  activeSchoolFilter.value = activeSchoolFilter.value === sName ? null : sName
  if (activeSchoolFilter.value && !expandedSchools.value.includes(sName)) {
    expandedSchools.value.push(sName)
  }
}

const toggleAccordion = (sName) => {
  const idx = expandedSchools.value.indexOf(sName)
  if (idx > -1) expandedSchools.value.splice(idx, 1)
  else expandedSchools.value.push(sName)
}

const filteredSchoolAccordion = computed(() => {
  if (activeSchoolFilter.value) {
    return props.availableSchools.filter(s => s.name === activeSchoolFilter.value)
  }
  return props.availableSchools
})

// ★ 核心修復：精準比對與容錯，過濾上陣成員 (!m.assigned) ★
const getUnassignedMembersBySchool = (schoolName) => {
  return (props.allMembers || []).filter(m => {
    if (!m) return false
    const notAssigned = !m.assigned // 自動過濾已上陣角色
    const matchSearch = !searchMemberQuery.value || (m.name && m.name.toLowerCase().includes(searchMemberQuery.value.trim().toLowerCase()))

    let matchSchool = false
    const mSchool = (m.currentSchool || '').trim()
    if (props.showSecondarySchool) {
      matchSchool = m.schools ? m.schools.includes(schoolName) : (mSchool === schoolName)
    } else {
      matchSchool = (mSchool === schoolName)
    }

    return matchSchool && notAssigned && matchSearch
  })
}

const getUnassignedCountBySchool = (schoolName) => {
  return getUnassignedMembersBySchool(schoolName).length
}

const allUnassignedMembersList = computed(() => {
  if (!Array.isArray(props.allMembers)) return []
  return props.allMembers.filter(m => {
    if (!m) return false
    const notAssigned = !m.assigned
    const matchSearch = !searchMemberQuery.value || (m.name && m.name.toLowerCase().includes(searchMemberQuery.value.trim().toLowerCase()))

    let matchSchool = true
    if (activeSchoolFilter.value) {
      const mSchool = (m.currentSchool || '').trim()
      if (props.showSecondarySchool) {
        matchSchool = m.schools ? m.schools.includes(activeSchoolFilter.value) : (mSchool === activeSchoolFilter.value)
      } else {
        matchSchool = (mSchool === activeSchoolFilter.value)
      }
    }

    return notAssigned && matchSearch && matchSchool
  })
})
</script>

<style scoped>
.pending-sidebar { width: 230px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.guild-select-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; color: #1e293b; margin-bottom: 12px; }

.pending-filter-bar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.pending-title-group { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.title-left-box { display: flex; align-items: center; gap: 4px; }
.pending-title { font-weight: bold; font-size: 13px; color: #334155; }
.btn-icon-add { background: none; border: none; color: #3b82f6; font-size: 18px; font-weight: bold; cursor: pointer; }

.pending-mode-toggle { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; }
.mode-pill-btn { padding: 2px 8px; border: none; background: white; font-size: 11px; cursor: pointer; color: #64748b; }
.mode-pill-btn.active { background: #5b7db1; color: white; font-weight: bold; }

.pending-search-input { width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box; }

.school-icon-filter-row { display: flex; flex-wrap: wrap; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 8px; }
.icon-filter-item { width: 26px; height: 26px; border-radius: 4px; border: 1px solid transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.icon-filter-item.active, .icon-filter-item:hover { background: #eff6ff; border-color: #3b82f6; }
.school-filter-img { width: 18px; height: 18px; object-fit: contain; }

.school-accordion-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.accordion-item { border-bottom: 1px solid #f8fafc; }
.accordion-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; cursor: pointer; font-size: 12px; }
.accordion-head-left { display: flex; align-items: center; gap: 6px; font-weight: 500; }
.accordion-school-img { width: 16px; height: 16px; object-fit: contain; }
.accordion-count { color: #94a3b8; }
.accordion-arrow { font-size: 16px; color: #94a3b8; }

.accordion-body { padding: 4px 0 8px 10px; display: flex; flex-direction: column; gap: 4px; }

.all-members-flow-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }

.member-drag-card { display: flex; align-items: center; gap: 6px; background: #f0f9ff; border: 1px solid #bae6fd; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: grab; color: #0369a1; transition: transform 0.15s; }
.member-drag-card:hover { transform: translateX(2px); }
.drag-card-icons-group { display: flex; align-items: center; gap: 2px; }
.drag-card-icon { width: 16px; height: 16px; object-fit: contain; }
.drag-card-icon-sub { width: 13px; height: 13px; object-fit: contain; opacity: 0.85; }
.empty-sub-text { font-size: 11px; color: #cbd5e1; padding: 4px 0; }
</style>