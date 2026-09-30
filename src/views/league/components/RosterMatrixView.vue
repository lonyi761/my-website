<template>
  <div class="teams-matrix-wrapper">
    <div v-for="(team, tIdx) in matrixTeams" :key="team.id" class="team-matrix-row">
      
      <!-- 團隊標頭列 -->
      <div class="team-header-row">
        <div 
          class="team-title-edit-group" 
          @click="canEdit && $emit('open-edit-team', tIdx)" 
          :title="canEdit ? '編輯團隊名稱與小隊職能' : team.name"
        >
          <span v-if="team.color" class="team-color-circle" :style="{ backgroundColor: team.color }"></span>
          <span class="team-row-title">{{ team.name }}</span>
          <span v-if="team.desc" class="team-row-desc">- {{ team.desc }}</span>
          <i v-if="canEdit" class="mdi mdi-pencil-outline team-pencil-icon"></i>
        </div>
        <button 
          v-if="canEdit && team.squads.length < 5" 
          class="add-squad-btn" 
          @click="$emit('add-squad', team)"
        >
          + 添加小隊
        </button>
      </div>

      <!-- 小隊網格 -->
      <div class="squads-matrix-grid">
        <div 
          v-for="squad in team.squads" 
          :key="squad.id" 
          class="squad-column-box"
          @dragover.prevent
          @drop="canEdit && $emit('drop-squad-column', { team, squad })"
        >
          <div 
            class="squad-column-head draggable-head" 
            :draggable="canEdit"
            @dragstart="canEdit && $emit('drag-start-squad', { team, squad })"
            :title="canEdit ? '按住可拖拽移動/交換整隊位置' : squad.name"
          >
            <div class="squad-head-title">
              <i v-if="canEdit" class="mdi mdi-drag-vertical drag-handle-icon"></i>
              {{ squad.name }} <template v-if="squad.zhineng">- {{ squad.zhineng }}</template>
            </div>
            <div v-if="squad.desc" class="squad-head-desc">{{ squad.desc }}</div>
          </div>

          <div class="slots-vertical-list">
            <div 
              v-for="(slot, slotIdx) in squad.slots" 
              :key="slot.id"
              :class="[
                'matrix-slot-card', 
                { 
                  'has-member': slot.assignedMember, 
                  'template-guideline': !slot.assignedMember && getSlotGuidelineText(slot),
                  'detail-mode': showDetails
                }
              ]"
              :style="getSlotStyle(slot)"
              :draggable="canEdit && !!slot.assignedMember"
              @dragstart="canEdit && $emit('drag-start-slot', { team, squad, slot })"
              @dragover.prevent
              @drop="canEdit && $emit('drop-slot', { team, squad, slot })"
              @click="$emit('click-slot', { team, squad, slot, slotIdx })"
            >
              <!-- 精簡模式 -->
              <template v-if="!showDetails">
                <template v-if="slot.assignedMember">
                  <div class="assigned-slot-content">
                    <div class="member-head-info">
                      <img :src="getSchoolImgByName(slot.assignedMember.currentSchool)" class="slot-school-icon" />
                      <img 
                        v-if="showSecondarySchool && getSecondarySchool(slot.assignedMember)" 
                        :src="getSchoolImgByName(getSecondarySchool(slot.assignedMember))" 
                        class="slot-school-icon-sub" 
                        title="副職業"
                      />
                      <span class="slot-member-name">{{ slot.assignedMember.name }}</span>
                    </div>
                    <span class="slot-roles-text">{{ getSlotRoleSummary(slot) }}</span>
                  </div>
                </template>

                <template v-else-if="getSlotGuidelineText(slot)">
                  <div class="template-guideline-content">
                    <span class="guideline-role-text">{{ getSlotGuidelineText(slot) }}</span>
                  </div>
                </template>

                <template v-else>
                  <div class="empty-slot-placeholder">{{ canEdit ? '點擊配置席位' : '未配置席位' }}</div>
                </template>
              </template>

              <!-- 詳情模式 -->
              <template v-else>
                <div class="slot-detail-body">
                  <div class="detail-head">
                    <template v-if="slot.assignedMember">
                      <img :src="getSchoolImgByName(slot.assignedMember.currentSchool)" class="slot-school-icon" />
                      <img 
                        v-if="showSecondarySchool && getSecondarySchool(slot.assignedMember)" 
                        :src="getSchoolImgByName(getSecondarySchool(slot.assignedMember))" 
                        class="slot-school-icon-sub" 
                      />
                      <span class="detail-member-title">{{ slot.assignedMember.name }}</span>
                    </template>
                    <template v-else>
                      <span class="detail-role-title">{{ getSlotRoleSummary(slot) || '未配置' }}</span>
                    </template>
                  </div>
                  <div class="detail-line">職能：{{ getSlotRoleSummary(slot) }}</div>
                  <div class="detail-line">絕技：{{ slot.jueji || slot.templateConfig?.jueji || '—' }}</div>
                  <div class="detail-line">群俠：{{ slot.qunxia || slot.templateConfig?.qunxia || '—' }}</div>
                  <div class="detail-line">技能：{{ slot.zhuangbei || slot.templateConfig?.zhuangbei || '—' }}</div>
                </div>
              </template>

              <span v-if="canEdit && slot.assignedMember" class="slot-clear-x" @click.stop="$emit('remove-member-slot', slot)" title="移除席位">&times;</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  matrixTeams: { type: Array, default: () => [] },
  availableSchools: { type: Array, default: () => [] },
  schoolColorMap: { type: Object, default: () => ({}) },
  showSecondarySchool: Boolean,
  showDetails: Boolean,
  canEdit: { type: Boolean, default: true }
})

defineEmits([
  'open-edit-team',
  'add-squad',
  'drag-start-squad',
  'drop-squad-column',
  'drag-start-slot',
  'drop-slot',
  'click-slot',
  'remove-member-slot'
])

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  const found = props.availableSchools.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

const getSecondarySchool = (member) => {
  if (!member || !member.schools || member.schools.length < 2) return ''
  return member.schools.find(s => s !== member.currentSchool) || ''
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
  return props.canEdit ? '點擊配置職能' : '—'
}

const getSlotGuidelineText = (slot) => {
  if (!slot.templateConfig) return ''
  const parts = []
  if (slot.templateConfig.roles && slot.templateConfig.roles.length > 0) {
    parts.push(slot.templateConfig.roles.join(' / '))
  }
  if (slot.templateConfig.schools && slot.templateConfig.schools.length > 0) {
    parts.push(slot.templateConfig.schools.join(' / '))
  }
  return parts.join(' - ')
}
</script>

<style scoped>
.teams-matrix-wrapper { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.team-matrix-row { background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px; }

.team-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.team-title-edit-group { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.team-title-edit-group:hover { background: #f1f5f9; }
.team-row-title { font-size: 14px; font-weight: bold; color: #1e293b; }
.team-row-desc { font-size: 13px; color: #94a3b8; font-weight: normal; margin-left: 2px; }
.team-pencil-icon { font-size: 14px; color: #94a3b8; }
.team-color-circle { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }

.add-squad-btn { background: none; border: 1px dashed #3b82f6; color: #3b82f6; padding: 2px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }

.squads-matrix-grid { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 10px; }
.squad-column-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }

.squad-column-head.draggable-head { display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; cursor: grab; padding: 4px; border-radius: 4px; }
.squad-column-head.draggable-head:hover { background: #e2e8f0; }
.drag-handle-icon { font-size: 12px; color: #94a3b8; }

.squad-head-title { font-size: 12px; font-weight: bold; color: #475569; display: flex; align-items: center; gap: 2px; }
.squad-head-desc { font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 2px; font-weight: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }

.slots-vertical-list { display: flex; flex-direction: column; gap: 6px; }
.matrix-slot-card { position: relative; min-height: 38px; border-radius: 4px; border: 1px dashed #cbd5e1; background: #ffffff; display: flex; align-items: center; padding: 6px 8px; cursor: pointer; transition: all 0.15s; }
.matrix-slot-card:hover { border-color: #3b82f6; }

.matrix-slot-card.detail-mode { flex-direction: column; align-items: flex-start; justify-content: center; }
.slot-detail-body { display: flex; flex-direction: column; gap: 2px; width: 100%; font-size: 10px; color: #475569; }
.detail-head { display: flex; align-items: center; gap: 4px; font-weight: bold; color: #1e293b; margin-bottom: 2px; }
.detail-member-title { font-size: 11px; }
.detail-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.matrix-slot-card.has-member { border: 1px solid #cbd5e1; cursor: grab; }
.assigned-slot-content { display: flex; flex-direction: column; width: 100%; }
.member-head-info { display: flex; align-items: center; gap: 4px; }
.slot-school-icon { width: 16px; height: 16px; object-fit: contain; }
.slot-school-icon-sub { width: 12px; height: 12px; object-fit: contain; opacity: 0.85; margin-left: -2px; }
.slot-member-name { font-size: 12px; font-weight: bold; color: #1e293b; }
.slot-roles-text { font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.matrix-slot-card.template-guideline { background: #fafafa; border: 1px solid #f1f5f9; }
.template-guideline-content { font-size: 10px; color: #94a3b8; }
.empty-slot-placeholder { font-size: 10px; color: #cbd5e1; width: 100%; text-align: center; }

.slot-clear-x { position: absolute; right: 4px; top: 2px; font-size: 12px; color: #94a3b8; cursor: pointer; opacity: 0; }
.matrix-slot-card:hover .slot-clear-x { opacity: 1; }
.slot-clear-x:hover { color: #ef4444; }
</style>