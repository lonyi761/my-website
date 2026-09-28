<template>
  <div class="spreadsheet-view-wrapper">
    <!-- 頂部資訊 Bar -->
    <div class="spreadsheet-header-bar">
      <span>{{ leagueInfo.guild || '百錵谷酒池肉林' }} + {{ leagueInfo.type }} + {{ leagueInfo.startTime }}</span>
    </div>

    <!-- 團隊橫向欄位列 -->
    <div class="spreadsheet-teams-row">
      <div v-for="team in matrixTeams" :key="team.id" class="spreadsheet-team-column">
        
        <!-- 團隊標頭 (顏色標示) -->
        <div class="spreadsheet-team-head">
          <span v-if="team.color" class="team-color-circle" :style="{ backgroundColor: team.color }"></span>
          <span class="font-bold">{{ team.name }}</span>
        </div>

        <!-- 小隊清單 -->
        <div class="spreadsheet-squads-list">
          <div v-for="squad in team.squads" :key="squad.id" class="spreadsheet-squad-block">
            <div class="spreadsheet-squad-head">
              <span class="squad-title">{{ squad.name }} <template v-if="squad.zhineng">({{ squad.zhineng }})</template></span>
              <span v-if="squad.desc" class="squad-sub-desc">{{ squad.desc }}</span>
            </div>

            <!-- 6 個席位列表 (Excel 試算表風格) -->
            <div class="spreadsheet-slots-table">
              <div 
                v-for="(slot, slotIdx) in squad.slots" 
                :key="slot.id" 
                class="spreadsheet-slot-row"
                :style="getSlotStyle(slot)"
                @click="$emit('click-slot', { team, squad, slot, slotIdx })"
              >
                <div class="slot-col-member">
                  <template v-if="slot.assignedMember">
                    <img :src="getSchoolImgByName(slot.assignedMember.currentSchool)" class="slot-school-icon" />
                    <span class="member-name">{{ slot.assignedMember.name }}</span>
                  </template>
                  <template v-else>
                    <span class="placeholder-text">點擊配置席位</span>
                  </template>
                </div>

                <div class="slot-col-role">{{ getSlotRoleSummary(slot) }}</div>
                <div class="slot-col-skill">{{ slot.jueji || slot.qunxia || slot.zhuangbei || '—' }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 團隊備註 -->
        <div v-if="team.desc" class="spreadsheet-team-footer-desc">
          備註：{{ team.desc }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  leagueInfo: { type: Object, default: () => ({}) },
  matrixTeams: { type: Array, default: () => [] },
  availableSchools: { type: Array, default: () => [] },
  schoolColorMap: { type: Object, default: () => ({}) }
})

defineEmits(['click-slot'])

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  const found = props.availableSchools.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

const getSlotStyle = (slot) => {
  if (slot.assignedMember) {
    const bg = props.schoolColorMap[slot.assignedMember.currentSchool] || '#eff6ff'
    return { backgroundColor: bg }
  }
  if (slot.templateConfig && slot.templateConfig.schools && slot.templateConfig.schools.length > 0) {
    const firstSchool = slot.templateConfig.schools[0]
    const bg = props.schoolColorMap[firstSchool] || '#fafafa'
    return { backgroundColor: bg }
  }
  return {}
}

const getSlotRoleSummary = (slot) => {
  if (slot.roles && slot.roles.length > 0) return slot.roles.join('、')
  return '點擊配置職能'
}
</script>

<style scoped>
.spreadsheet-view-wrapper { background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 16px; overflow-x: auto; display: flex; flex-direction: column; gap: 12px; }
.spreadsheet-header-bar { background: #eff6ff; color: #1d4ed8; padding: 10px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; text-align: center; border: 1px solid #bfdbfe; }
.spreadsheet-teams-row { display: flex; gap: 16px; min-width: max-content; }
.spreadsheet-team-column { width: 280px; border: 1px solid #e2e8f0; border-radius: 6px; background: #ffffff; display: flex; flex-direction: column; overflow: hidden; }
.spreadsheet-team-head { background: #f8fafc; padding: 10px; font-size: 13px; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; gap: 8px; }

.spreadsheet-squads-list { display: flex; flex-direction: column; gap: 12px; padding: 10px; }
.spreadsheet-squad-block { border: 1px solid #f1f5f9; border-radius: 6px; overflow: hidden; background: #fafafa; }
.spreadsheet-squad-head { background: #f1f5f9; padding: 6px 10px; font-size: 12px; display: flex; flex-direction: column; }
.squad-title { font-weight: bold; color: #334155; }
.squad-sub-desc { font-size: 10px; color: #94a3b8; font-style: italic; }

.spreadsheet-slots-table { display: flex; flex-direction: column; border-top: 1px solid #e2e8f0; }
.spreadsheet-slot-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #f1f5f9; font-size: 11px; cursor: pointer; transition: background 0.15s; }
.spreadsheet-slot-row:hover { background: #eff6ff !important; }
.slot-col-member { display: flex; align-items: center; gap: 4px; font-weight: bold; width: 90px; }
.member-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slot-col-role { width: 80px; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.slot-col-skill { flex: 1; color: #94a3b8; text-align: right; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.placeholder-text { color: #cbd5e1; font-weight: normal; }

.spreadsheet-team-footer-desc { font-size: 11px; color: #64748b; padding: 8px 10px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-style: italic; }
.team-color-circle { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
.slot-school-icon { width: 16px; height: 16px; object-fit: contain; }
.font-bold { font-weight: bold; }
</style>