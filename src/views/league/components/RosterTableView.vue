<template>
  <div class="spreadsheet-view-wrapper">
    
    <!-- 圖二：頂部 Banner 資訊列 (加大字體，格式：幫會名稱 幫會聯賽 MM/DD HH:mm) -->
    <div class="spreadsheet-header-banner">
      <span class="banner-title">
        {{ leagueInfo.guild || '百錵谷酒池肉林' }} + {{ leagueInfo.type || '幫會聯賽' }} + {{ formatShortDate(leagueInfo.startTime) }}
      </span>
    </div>

    <!-- 圖三：獨立可編輯備註橫幅欄位 -->
    <div class="top-editable-banner-box">
      <div v-if="!isEditingTopBanner" class="banner-display-text" @click="isEditingTopBanner = true" title="點擊編輯橫幅備註">
        {{ topBannerText || '可編輯備註區' }}
        <i class="mdi mdi-pencil-outline edit-icon"></i>
      </div>
      <input 
        v-else 
        type="text" 
        v-model="topBannerText" 
        @blur="isEditingTopBanner = false" 
        @keyup.enter="isEditingTopBanner = false" 
        class="banner-input-field" 
        placeholder="請輸入橫幅備註內容..." 
        v-focus
      />
    </div>

    <!-- 圖四/圖五：團隊表格 (最多 3 隊並排，寬度適度拓寬) -->
    <div class="spreadsheet-teams-grid">
      <div 
        v-for="team in matrixTeams.slice(0, 3)" 
        :key="team.id" 
        class="spreadsheet-team-card"
      >
        <!-- 圖五：團隊名稱頂部欄位 (帶顏色球標) -->
        <div class="spreadsheet-team-header-bar" :style="getTeamHeaderStyle(team)">
          <span class="team-header-title">
            <span v-if="team.color" class="team-color-dot" :style="{ backgroundColor: team.color }"></span>
            {{ team.name }}
            <span v-if="team.color" class="color-tag-name">【顯示{{ getColorLabel(team.color) }}🟢】</span>
          </span>
        </div>

        <!-- 圖五：表格內容區塊 -->
        <div class="table-scroll-container">
          <table class="spreadsheet-squad-table">
            <thead>
              <tr>
                <th width="110" class="th-squad">小隊</th>
                <th width="110" class="th-member">暱稱</th>
                <th width="110" class="th-role">職能</th>
                <th width="90" class="th-skill">技能分配</th>
                <th width="90" class="th-skill">技能分配</th>
                <th width="80" class="th-jueji">絕技</th>
              </tr>
            </thead>
            <tbody>
              <template v-for="(squad, sqIdx) in team.squads" :key="squad.id">
                <tr 
                  v-for="(slot, slotIdx) in squad.slots" 
                  :key="slot.id" 
                  class="slot-data-row"
                  :style="getSlotRowStyle(slot)"
                  @dragover.prevent
                  @drop="$emit('drop-slot', { team, squad, slot })"
                  @click="$emit('click-slot', { team, squad, slot, slotIdx })"
                >
                  <!-- 圖五：小隊資訊欄位 (小隊名、職能、備註合併於左側第 1 欄) -->
                  <td 
                    v-if="slotIdx === 0" 
                    :rowspan="squad.slots.length" 
                    class="squad-info-cell"
                  >
                    <div class="squad-info-box">
                      <div class="squad-title-text">{{ squad.name }}</div>
                      <div v-if="squad.zhineng" class="squad-role-text">({{ squad.zhineng }})</div>
                      <div v-if="squad.desc" class="squad-desc-text">({{ squad.desc }})</div>
                    </div>
                  </td>

                  <!-- 圖一：成員/席位 (支援拖拽) -->
                  <td class="member-cell" :draggable="!!slot.assignedMember" @dragstart="$emit('drag-start-slot', { team, squad, slot })">
                    <template v-if="slot.assignedMember">
                      <img :src="getSchoolImgByName(slot.assignedMember.currentSchool)" class="slot-school-icon" />
                      <span class="member-name-text">{{ slot.assignedMember.name }}</span>
                    </template>
                    <template v-else>
                      <span class="slot-placeholder-text">點擊配置席位</span>
                    </template>
                  </td>

                  <!-- 職能 -->
                  <td class="role-cell">
                    {{ getSlotRoleSummary(slot) }}
                  </td>

                  <!-- 技能分配 (群俠百家) -->
                  <td class="skill-cell">
                    {{ slot.qunxia || slot.templateConfig?.qunxia || '—' }}
                  </td>

                  <!-- 技能分配 (流派技能) -->
                  <td class="skill-cell">
                    {{ slot.zhuangbei || slot.templateConfig?.zhuangbei || '—' }}
                  </td>

                  <!-- 絕技 -->
                  <td class="jueji-cell">
                    {{ slot.jueji || slot.templateConfig?.jueji || '—' }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- 圖六 & 圖七：團隊備註與下方自訂備註欄位 -->
        <div class="spreadsheet-team-footer">
          <!-- 圖六：團隊備註 (字體放大，標準正體) -->
          <div v-if="team.desc" class="team-main-desc">
            我是團隊備註會顯示的地方：{{ team.desc }}
          </div>

          <!-- 圖七：團隊備註下方預留自訂備註區 -->
          <div class="team-bottom-extra-note" @click="editTeamBottomNote(team)">
            <template v-if="team.bottomNote">
              {{ team.bottomNote }}
            </template>
            <template v-else>
              <span class="placeholder-note-text">可編輯備註區</span>
            </template>
          </div>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  leagueInfo: { type: Object, default: () => ({}) },
  matrixTeams: { type: Array, default: () => [] },
  availableSchools: { type: Array, default: () => [] },
  schoolColorMap: { type: Object, default: () => ({}) }
})

defineEmits(['click-slot', 'drag-start-slot', 'drop-slot'])

// 自訂指令：自動聚焦
const vFocus = {
  mounted: (el) => el.focus()
}

// 圖三：頂部橫幅可編輯備註
const isEditingTopBanner = ref(false)
const topBannerText = ref('我是團隊備註會顯示的地方')

// 圖二：時間格式化 Helper (僅呈現 MM/DD HH:mm)
const formatShortDate = (timeStr) => {
  if (!timeStr) return '10/10 20:00'
  // 匹配 2026-10-10 20:00 -> 10/10 20:00
  return timeStr.replace(/^\d{4}-/, '').replace('-', '/')
}

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  const found = props.availableSchools.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

const getColorLabel = (colorHex) => {
  const map = {
    '#84cc16': '藍綠色',
    '#eab308': '金色',
    '#06b6d4': '淺藍色',
    '#3b82f6': '深藍色',
    '#a855f7': '淡紫色'
  }
  return map[colorHex] || '藍綠色'
}

const getTeamHeaderStyle = (team) => {
  if (team.color) {
    return {
      backgroundColor: team.color,
      color: '#ffffff'
    }
  }
  return {
    backgroundColor: '#3b82f6',
    color: '#ffffff'
  }
}

const getSlotRowStyle = (slot) => {
  if (slot.assignedMember) {
    const bg = props.schoolColorMap[slot.assignedMember.currentSchool] || '#eff6ff'
    return { backgroundColor: bg }
  }
  return { backgroundColor: '#ffffff' }
}

const getSlotRoleSummary = (slot) => {
  if (slot.roles && slot.roles.length > 0) return slot.roles.join('、')
  return '點擊配置職能'
}

// 圖七：編輯團隊下方自訂備註
const editTeamBottomNote = (team) => {
  const val = prompt('請輸入團隊下方自訂備註內容：', team.bottomNote || '')
  if (val !== null) {
    team.bottomNote = val.trim()
  }
}
</script>

<style scoped>
.spreadsheet-view-wrapper {
  background: #ffffff;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 圖二：頂部 Banner */
.spreadsheet-header-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 12px 20px;
  text-align: center;
}
.banner-title {
  font-size: 16px;
  font-weight: bold;
  color: #1d4ed8;
  letter-spacing: 0.5px;
}

/* 圖三：可編輯備註橫幅 */
.top-editable-banner-box {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 8px 14px;
  font-size: 13px;
  color: #334155;
}
.banner-display-text {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
}
.banner-display-text:hover {
  color: #2563eb;
}
.edit-icon {
  font-size: 14px;
  color: #94a3b8;
}
.banner-input-field {
  width: 100%;
  border: none;
  outline: none;
  font-size: 13px;
  color: #1e293b;
  background: transparent;
}

/* 圖四/圖五：團隊表格 Layout (最多 3 隊，寬度拓寬) */
.spreadsheet-teams-grid {
  display: grid;
  grid-template-columns: repeat(min(3, max(1, matrixTeams?.length || 1)), minmax(380px, 1fr));
  gap: 16px;
  overflow-x: auto;
}

.spreadsheet-team-card {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.spreadsheet-team-header-bar {
  padding: 10px 14px;
  font-size: 15px;
  font-weight: bold;
  display: flex;
  align-items: center;
}
.team-header-title {
  display: flex;
  align-items: center;
  gap: 6px;
}
.team-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
.color-tag-name {
  font-size: 13px;
  font-weight: normal;
  opacity: 0.9;
}

/* 表格樣式 (圖五對應) */
.table-scroll-container {
  overflow-x: auto;
}
.spreadsheet-squad-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  text-align: center;
}
.spreadsheet-squad-table th {
  background: #f8fafc;
  color: #475569;
  padding: 8px 6px;
  border: 1px solid #e2e8f0;
  font-weight: bold;
}
.spreadsheet-squad-table td {
  padding: 6px 8px;
  border: 1px solid #e2e8f0;
}

/* 圖五：小隊資訊置於最左側欄位 */
.squad-info-cell {
  background: #f8fafc;
  vertical-align: middle;
  padding: 10px 6px !important;
}
.squad-info-box {
  display: flex;
  flex-direction: column;
  gap: 2px;
  align-items: center;
  justify-content: center;
}
.squad-title-text {
  font-weight: bold;
  font-size: 13px;
  color: #1e293b;
}
.squad-role-text {
  font-size: 11px;
  color: #475569;
}
.squad-desc-text {
  font-size: 10px;
  color: #94a3b8;
}

.slot-data-row {
  cursor: pointer;
  transition: background 0.15s;
}
.slot-data-row:hover {
  filter: brightness(0.97);
}

.member-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
  font-weight: bold;
}
.slot-school-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}
.slot-placeholder-text {
  color: #cbd5e1;
  font-weight: normal;
}

.role-cell, .skill-cell, .jueji-cell {
  color: #334155;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 圖六 & 圖七：團隊底部備註 */
.spreadsheet-team-footer {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.team-main-desc {
  font-size: 13px;
  font-weight: bold; /* 圖六：取消斜體，字體加大 */
  color: #334155;
  font-style: normal;
}
.team-bottom-extra-note {
  font-size: 12px;
  color: #64748b;
  cursor: pointer;
  padding: 4px 8px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 4px;
}
.team-bottom-extra-note:hover {
  border-color: #3b82f6;
  color: #2563eb;
}
.placeholder-note-text {
  color: #94a3b8;
}
</style>