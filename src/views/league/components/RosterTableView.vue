<template>
  <div class="spreadsheet-view-wrapper">
    
    <!-- 圖六：頂部 Banner 資訊列 (拿掉+號，字體放大) -->
    <div class="spreadsheet-header-banner">
      <span class="banner-title">
        {{ leagueInfo.guild || '百錵谷酒池肉林' }} &nbsp;&nbsp; {{ leagueInfo.type || '幫會聯賽' }} &nbsp;&nbsp; {{ formatShortDate(leagueInfo.startTime) }}
      </span>
    </div>

    <!-- 圖三：獨立可編輯備註橫幅欄位 (字體放大) -->
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

    <!-- 團隊表格 -->
    <div class="spreadsheet-teams-grid">
      <div 
        v-for="(team, tIdx) in matrixTeams" 
        :key="team.id" 
        class="spreadsheet-team-card"
      >
        <!-- 團隊名稱頂部欄位 (點擊開啟編輯團隊 Modal) -->
        <div class="spreadsheet-team-header-bar" :style="getTeamHeaderStyle(team)" @click="$emit('open-edit-team', tIdx)">
          <span class="team-header-title">
            <span v-if="team.color" class="team-color-dot" :style="{ backgroundColor: team.color }"></span>
            {{ team.name }}
            <span v-if="team.color" class="color-tag-name">【顯示{{ getColorLabel(team.color) }}🟢】</span>
          </span>
          <i class="mdi mdi-pencil-outline header-edit-pencil"></i>
        </div>

        <!-- 表格內容區塊 -->
        <div class="table-scroll-container">
          <table class="spreadsheet-squad-table">
            <thead>
              <tr>
                <th width="85" class="th-squad">小隊</th>
                <th width="140" class="th-member">暱稱</th>
                <th width="150" class="th-role">職能</th>
                <th width="140" class="th-skill">技能分配</th>
                <th width="140" class="th-skill">技能分配</th>
                <th width="120" class="th-jueji">絕技</th>
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
                  <!-- 圖一 & 圖二：小隊欄 (變窄，點擊開啟編輯團隊 Modal) -->
                  <td 
                    v-if="slotIdx === 0" 
                    :rowspan="squad.slots.length" 
                    class="squad-info-cell"
                    @click.stop="$emit('open-edit-team', tIdx)"
                    title="點擊編輯團隊與小隊名稱/職能"
                  >
                    <div class="squad-info-box">
                      <div class="squad-title-text">{{ squad.name }}</div>
                      <div v-if="squad.zhineng" class="squad-role-text">({{ squad.zhineng }})</div>
                      <div v-if="squad.desc" class="squad-desc-text">({{ squad.desc }})</div>
                    </div>
                  </td>

                  <!-- 圖一：暱稱欄 (字體/寬度加大、上下空間增加、支援拖拽) -->
                  <td 
                    class="member-cell" 
                    :draggable="!!slot.assignedMember" 
                    @dragstart.stop="$emit('drag-start-slot', { team, squad, slot })"
                  >
                    <template v-if="slot.assignedMember">
                      <img :src="getSchoolImgByName(slot.assignedMember.currentSchool)" class="slot-school-icon" />
                      <span class="member-name-text">{{ slot.assignedMember.name }}</span>
                    </template>
                    <template v-else>
                      <span class="slot-placeholder-text">點擊配置席位</span>
                    </template>
                  </td>

                  <!-- 圖一：職能 (防文字吃色) -->
                  <td class="role-cell">
                    {{ getSlotRoleSummary(slot) }}
                  </td>

                  <!-- 圖一：技能分配 (群俠百家) -->
                  <td class="skill-cell">
                    {{ slot.qunxia || slot.templateConfig?.qunxia || '—' }}
                  </td>

                  <!-- 圖一：技能分配 (流派技能) -->
                  <td class="skill-cell">
                    {{ slot.zhuangbei || slot.templateConfig?.zhuangbei || '—' }}
                  </td>

                  <!-- 圖一：絕技 -->
                  <td class="jueji-cell">
                    {{ slot.jueji || slot.templateConfig?.jueji || '—' }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- 圖三：團隊備註區 (移除前面固定引導文字) -->
        <div class="spreadsheet-team-footer">
          <div v-if="team.desc" class="team-main-desc">
            {{ team.desc }}
          </div>

          <!-- 可編輯備註區 (圖四對應) -->
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

defineEmits(['click-slot', 'drag-start-slot', 'drop-slot', 'open-edit-team'])

const vFocus = {
  mounted: (el) => el.focus()
}

const isEditingTopBanner = ref(false)
const topBannerText = ref('我是團隊備註會顯示的地方')

// 圖六：日期格式化 (MM/DD HH:mm)
const formatShortDate = (timeStr) => {
  if (!timeStr) return '10/10 20:00'
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

/* 圖六：頂部 Banner */
.spreadsheet-header-banner {
  background: #eff6ff;
  border: 1px solid #bfdbfe;
  border-radius: 8px;
  padding: 14px 20px;
  text-align: center;
}
.banner-title {
  font-size: 18px;
  font-weight: bold;
  color: #1d4ed8;
  letter-spacing: 0.5px;
}

/* 圖三：可編輯備註橫幅 */
.top-editable-banner-box {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 10px 16px;
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
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
  font-size: 15px;
  color: #94a3b8;
}
.banner-input-field {
  width: 100%;
  border: none;
  outline: none;
  font-size: 15px;
  font-weight: 500;
  color: #1e293b;
  background: transparent;
}

/* 團隊表格 Layout */
.spreadsheet-teams-grid {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.spreadsheet-team-card {
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}

.spreadsheet-team-header-bar {
  padding: 12px 16px;
  font-size: 16px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}
.team-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.team-color-dot {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(255,255,255,0.6);
}
.color-tag-name {
  font-size: 13px;
  font-weight: normal;
  opacity: 0.9;
}
.header-edit-pencil {
  font-size: 16px;
  opacity: 0.8;
  margin-left: 8px;
}

/* 表格樣式 (圖一：字體/寬度放大、小隊欄變窄、上下空間增多) */
.table-scroll-container {
  overflow-x: auto;
  width: 100%;
}
.spreadsheet-squad-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
  text-align: center;
}
.spreadsheet-squad-table th {
  background: #f8fafc;
  color: #334155;
  padding: 10px 8px;
  border: 1px solid #cbd5e1;
  font-weight: bold;
  font-size: 13px;
}
.spreadsheet-squad-table td {
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
}

/* 圖一：小隊資訊置於最左側欄位 (縮窄) */
.squad-info-cell {
  background: #f8fafc;
  vertical-align: middle;
  padding: 10px 4px !important;
  cursor: pointer;
  transition: background 0.15s;
}
.squad-info-cell:hover {
  background: #f1f5f9;
}
.squad-info-box {
  display: flex;
  flex-direction: column;
  gap: 3px;
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
  filter: brightness(0.96);
}

/* 圖五：成員與文字高對比，避免職業底色洗掉字體 */
.member-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
  font-weight: bold;
  font-size: 13px;
  color: #1e293b !important;
}
.slot-school-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
}
.member-name-text {
  color: #1e293b !important;
}
.slot-placeholder-text {
  color: #94a3b8;
  font-weight: normal;
}

.role-cell, .skill-cell, .jueji-cell {
  color: #1e293b !important;
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 圖三：團隊底部備註 (移除固定開頭文字，放大字體) */
.spreadsheet-team-footer {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.team-main-desc {
  font-size: 14px;
  font-weight: bold;
  color: #1e293b;
  font-style: normal;
  line-height: 1.5;
}

/* 可編輯備註區 (圖四對應) */
.team-bottom-extra-note {
  font-size: 14px;
  font-weight: 500;
  color: #1e293b;
  cursor: pointer;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  transition: all 0.2s;
}
.team-bottom-extra-note:hover {
  border-color: #3b82f6;
  color: #2563eb;
  background: #f0f9ff;
}
.placeholder-note-text {
  color: #94a3b8;
}
</style>