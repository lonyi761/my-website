<template>
  <div class="spreadsheet-view-wrapper">
    
    <!-- 頂部 Banner 資訊列 -->
    <div v-if="showHeaderTitle" class="spreadsheet-header-banner">
      <span class="banner-title">
        {{ leagueInfo.guild || '百錵谷酒池肉林' }} &nbsp;&nbsp; {{ leagueInfo.type || '幫會聯賽' }} &nbsp;&nbsp; {{ formatShortDate(leagueInfo.startTime) }}
      </span>
    </div>

    <!-- 中間可編輯備註橫幅 -->
    <div v-if="showHeaderNote" class="top-editable-banner-box" @click="startEditTopBanner">
      <!-- 1. 展示模式 (無雜項按鈕，極致乾淨，適合圖片導出) -->
      <div 
        v-if="!isEditingTopBanner" 
        class="banner-display-text" 
        :style="{ fontSize: topBannerFontSize + 'px' }"
      >
        <span class="banner-text-content">
          {{ topBannerText || '可編輯備註區 (點擊任意處編輯)' }}
        </span>
      </div>

      <!-- 2. 編輯模式 -->
      <div v-else class="banner-edit-container" @click.stop>
        <input 
          type="text" 
          v-model="topBannerText" 
          class="banner-input-field text-center" 
          :style="{ fontSize: topBannerFontSize + 'px' }"
          placeholder="請輸入橫幅備註內容..." 
          v-focus
          @keyup.enter="isEditingTopBanner = false"
        />
        <div class="font-size-controls">
          <button type="button" class="btn-font-size" @click="changeTopFontSize(-1)" title="縮小字體">A-</button>
          <span class="size-label">{{ topBannerFontSize }}px</span>
          <button type="button" class="btn-font-size" @click="changeTopFontSize(1)" title="放大字體">A+</button>
          <button type="button" class="btn-done-sm" @click="isEditingTopBanner = false">完成</button>
        </div>
      </div>
    </div>

    <!-- 團隊表格 -->
    <div class="spreadsheet-teams-grid">
      <div 
        v-for="(team, tIdx) in matrixTeams" 
        :key="team.id" 
        class="spreadsheet-team-card"
      >
        <!-- 團隊名稱頂部欄位 -->
        <div 
          class="spreadsheet-team-header-bar" 
          @click="$emit('open-edit-team', tIdx)"
        >
          <span class="team-header-title">
            <span class="team-color-dot" :style="{ backgroundColor: getTeamColor(team, tIdx) }"></span>
            <span class="team-name-text">{{ team.name }}</span>
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
                  @dragover.prevent
                  @drop="$emit('drop-slot', { team, squad, slot })"
                  @click="$emit('click-slot', { team, squad, slot, slotIdx })"
                >
                  <!-- ★ 小隊欄位 ★ -->
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

                  <!-- 成員欄位 -->
                  <td 
                    class="member-cell" 
                    :style="getSlotRowStyle(slot)"
                    :draggable="!!slot.assignedMember" 
                    @dragstart.stop="$emit('drag-start-slot', { team, squad, slot })"
                  >
                    <template v-if="slot.assignedMember">
                      <img :src="getSchoolImgByName(slot.assignedMember.currentSchool)" class="slot-school-icon" />
                      <span class="member-name-text">{{ slot.assignedMember.name }}</span>
                    </template>
                    <template v-else-if="slot.templateConfig && slot.templateConfig.schools && slot.templateConfig.schools.length > 0">
                      <div class="guideline-school-icons">
                        <img 
                          v-for="sName in slot.templateConfig.schools" 
                          :key="sName" 
                          :src="getSchoolImgByName(sName)" 
                          class="slot-school-icon" 
                        />
                      </div>
                      <span class="slot-placeholder-text">席位配置</span>
                    </template>
                    <template v-else>
                      <span class="slot-placeholder-text">點擊配置席位</span>
                    </template>
                  </td>

                  <!-- 職能 (未配置時預設為空白 '') -->
                  <td class="role-cell" :style="getSlotRowStyle(slot)">
                    {{ getSlotRoleSummary(slot) }}
                  </td>

                  <!-- 技能分配 (群俠百家) -->
                  <td class="skill-cell" :style="getSlotRowStyle(slot)">
                    {{ slot.qunxia || slot.templateConfig?.qunxia || '—' }}
                  </td>

                  <!-- 技能分配 (流派技能) -->
                  <td class="skill-cell" :style="getSlotRowStyle(slot)">
                    {{ slot.zhuangbei || slot.templateConfig?.zhuangbei || '—' }}
                  </td>

                  <!-- 絕技 -->
                  <td class="jueji-cell" :style="getSlotRowStyle(slot)">
                    {{ slot.jueji || slot.templateConfig?.jueji || '—' }}
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- 團隊底部備註 -->
        <div class="spreadsheet-team-footer">
          <!-- 1. 團隊備註區塊 -->
          <div class="team-note-wrapper" @click="editingTeamDescId = team.id">
            <div 
              v-if="editingTeamDescId !== team.id" 
              class="note-display-box" 
              :style="{ fontSize: (team.descFontSize || 14) + 'px' }"
              title="點擊任意處編輯團隊備註"
            >
              <span v-if="team.desc" class="note-text-bold">{{ team.desc }}</span>
              <span v-else class="placeholder-note-text">點擊新增團隊備註</span>
            </div>

            <div v-else class="note-edit-box" @click.stop>
              <input 
                type="text" 
                v-model="team.desc" 
                class="note-inline-input" 
                :style="{ fontSize: (team.descFontSize || 14) + 'px' }"
                placeholder="請輸入團隊備註..." 
                v-focus
                @keyup.enter="editingTeamDescId = null"
              />
              <div class="font-size-controls">
                <button type="button" class="btn-font-size" @click="adjustTeamDescFontSize(team, -1)">A-</button>
                <span class="size-label">{{ team.descFontSize || 14 }}px</span>
                <button type="button" class="btn-font-size" @click="adjustTeamDescFontSize(team, 1)">A+</button>
                <button type="button" class="btn-done-sm" @click="editingTeamDescId = null">完成</button>
              </div>
            </div>
          </div>

          <!-- 2. 下方可編輯備註區 -->
          <div class="team-note-wrapper" @click="editingTeamBottomNoteId = team.id">
            <div 
              v-if="editingTeamBottomNoteId !== team.id" 
              class="note-display-box extra-note-box" 
              :style="{ fontSize: (team.bottomNoteFontSize || 14) + 'px' }"
              title="點擊任意處編輯自訂備註"
            >
              <span v-if="team.bottomNote" class="note-text-bold">{{ team.bottomNote }}</span>
              <span v-else class="placeholder-note-text">可編輯備註區</span>
            </div>

            <div v-else class="note-edit-box" @click.stop>
              <input 
                type="text" 
                v-model="team.bottomNote" 
                class="note-inline-input" 
                :style="{ fontSize: (team.bottomNoteFontSize || 14) + 'px' }"
                placeholder="請輸入自訂備註..." 
                v-focus
                @keyup.enter="editingTeamBottomNoteId = null"
              />
              <div class="font-size-controls">
                <button type="button" class="btn-font-size" @click="adjustTeamBottomFontSize(team, -1)">A-</button>
                <span class="size-label">{{ team.bottomNoteFontSize || 14 }}px</span>
                <button type="button" class="btn-font-size" @click="adjustTeamBottomFontSize(team, 1)">A+</button>
                <button type="button" class="btn-done-sm" @click="editingTeamBottomNoteId = null">完成</button>
              </div>
            </div>
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
  schoolColorMap: { type: Object, default: () => ({}) },
  showHeaderTitle: { type: Boolean, default: true },
  showHeaderNote: { type: Boolean, default: true }
})

defineEmits(['click-slot', 'drag-start-slot', 'drop-slot', 'open-edit-team'])

const vFocus = {
  mounted: (el) => el.focus()
}

const isEditingTopBanner = ref(false)
const topBannerText = ref('我是團隊備註會顯示的地方')
const topBannerFontSize = ref(15)

const startEditTopBanner = () => {
  isEditingTopBanner.value = true
}

const editingTeamDescId = ref(null)
const editingTeamBottomNoteId = ref(null)

const defaultTeamColors = ['#84cc16', '#eab308', '#06b6d4', '#3b82f6', '#a855f7']

const changeTopFontSize = (delta) => {
  topBannerFontSize.value = Math.max(12, Math.min(28, topBannerFontSize.value + delta))
}

const adjustTeamDescFontSize = (team, delta) => {
  if (!team.descFontSize) team.descFontSize = 14
  team.descFontSize = Math.max(12, Math.min(28, team.descFontSize + delta))
}

const adjustTeamBottomFontSize = (team, delta) => {
  if (!team.bottomNoteFontSize) team.bottomNoteFontSize = 14
  team.bottomNoteFontSize = Math.max(12, Math.min(28, team.bottomNoteFontSize + delta))
}

const formatShortDate = (timeStr) => {
  if (!timeStr) return '10/10 20:00'
  return timeStr.replace(/^\d{4}-/, '').replace('-', '/')
}

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  if (!props.availableSchools) return ''
  const found = props.availableSchools.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

const getTeamColor = (team, tIdx) => {
  if (team && team.color) return team.color
  return defaultTeamColors[tIdx % defaultTeamColors.length]
}

// 支援「成員現有流派底色」與「席位配置推薦流派底色」雙重渲染
const getSlotRowStyle = (slot) => {
  if (slot.assignedMember) {
    const bg = props.schoolColorMap[slot.assignedMember.currentSchool] || '#eff6ff'
    return { backgroundColor: bg }
  }
  if (slot.templateConfig && slot.templateConfig.schools && slot.templateConfig.schools.length > 0) {
    const firstSchool = slot.templateConfig.schools[0]
    const bg = props.schoolColorMap[firstSchool] || '#ffffff'
    return { backgroundColor: bg }
  }
  return { backgroundColor: '#ffffff' }
}

// 未配置職能預設回傳空白 ''
const getSlotRoleSummary = (slot) => {
  if (slot.roles && slot.roles.length > 0) return slot.roles.join('、')
  if (slot.assignedMember && slot.assignedMember.rolePreference && slot.assignedMember.rolePreference.length > 0) {
    return slot.assignedMember.rolePreference.join('、')
  }
  if (slot.templateConfig && slot.templateConfig.roles && slot.templateConfig.roles.length > 0) {
    return slot.templateConfig.roles.join('、')
  }
  return ''
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

.top-editable-banner-box {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  padding: 10px 16px;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  cursor: pointer;
  box-sizing: border-box;
}
.top-editable-banner-box:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}

.banner-display-text {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  font-weight: bold;
  color: #1e293b;
  min-height: 24px;
}
.banner-edit-container {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
}
.banner-input-field {
  flex: 1;
  border: 1px solid #3b82f6;
  border-radius: 4px;
  padding: 6px 10px;
  outline: none;
  font-weight: bold;
  color: #1e293b;
  background: #ffffff;
}
.text-center {
  text-align: center;
}

.font-size-controls {
  display: flex;
  align-items: center;
  gap: 4px;
  background: #f1f5f9;
  padding: 3px 8px;
  border-radius: 4px;
  border: 1px solid #cbd5e1;
}
.btn-font-size {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 3px;
  font-size: 11px;
  padding: 2px 6px;
  cursor: pointer;
  color: #334155;
  font-weight: bold;
}
.btn-font-size:hover {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}
.size-label {
  font-size: 11px;
  color: #64748b;
  min-width: 28px;
  text-align: center;
}
.btn-done-sm {
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 3px;
  font-size: 11px;
  padding: 2px 8px;
  cursor: pointer;
  margin-left: 4px;
}

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
  background: #f8fafc;
  border-bottom: 2px solid #e2e8f0;
  transition: background 0.15s;
}
.spreadsheet-team-header-bar:hover {
  background: #f1f5f9 !important;
}

.team-header-title {
  display: flex;
  align-items: center;
  gap: 8px;
}
.team-color-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}
.team-name-text {
  color: #1e293b;
  font-weight: bold;
}
.header-edit-pencil {
  font-size: 16px;
  color: #94a3b8;
  margin-left: 8px;
}

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

.squad-info-cell {
  background-color: #f8fafc !important;
  vertical-align: middle;
  text-align: center;
  padding: 10px 4px !important;
  cursor: pointer;
  position: relative;
  z-index: 2;
  transition: background 0.15s;
}
.squad-info-cell:hover {
  background-color: #f1f5f9 !important;
}
.squad-info-box {
  text-align: center;
  width: 100%;
  margin: 0 auto;
}
.squad-title-text {
  font-weight: bold;
  font-size: 13px;
  color: #1e293b;
  margin-bottom: 2px;
}
.squad-role-text {
  font-size: 11px;
  color: #475569;
  margin-bottom: 2px;
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

.member-cell {
  vertical-align: middle;
  text-align: center;
  font-weight: bold;
  font-size: 13px;
  color: #1e293b !important;
}
.guideline-school-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  vertical-align: middle;
}
.slot-school-icon {
  width: 18px;
  height: 18px;
  object-fit: contain;
  vertical-align: middle;
  display: inline-block;
  margin-right: 4px;
}
.member-name-text {
  color: #1e293b !important;
  vertical-align: middle;
  display: inline-block;
}
.slot-placeholder-text {
  color: #94a3b8;
  font-weight: normal;
  vertical-align: middle;
}

.role-cell, .skill-cell, .jueji-cell {
  color: #1e293b !important;
  font-weight: 500;
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: middle;
}

.spreadsheet-team-footer {
  background: #f8fafc;
  border-top: 1px solid #e2e8f0;
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.team-note-wrapper {
  width: 100%;
}
.note-display-box {
  padding: 8px 12px;
  background: #ffffff;
  border: 1px dashed #cbd5e1;
  border-radius: 6px;
  cursor: pointer;
  color: #1e293b;
  width: 100%;
  box-sizing: border-box;
  min-height: 36px;
  display: flex;
  align-items: center;
  transition: all 0.15s;
}
.note-display-box:hover {
  border-color: #3b82f6;
  background: #f0f9ff;
}
.note-text-bold {
  font-weight: bold;
}
.placeholder-note-text {
  color: #94a3b8;
  font-size: 13px;
}
.note-edit-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #ffffff;
  padding: 6px 10px;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  width: 100%;
  box-sizing: border-box;
}
.note-inline-input {
  flex: 1;
  border: none;
  outline: none;
  font-weight: bold;
  color: #1e293b;
}
</style>