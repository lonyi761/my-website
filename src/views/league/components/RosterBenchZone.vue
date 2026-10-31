<template>
  <!-- 導出模式：僅顯示候補名單，不顯示不出席 -->
  <div v-if="exportMode" class="bench-export-card">
    <div class="bench-export-head">
      <i class="mdi mdi-account-clock-outline"></i>
      <span>候補名單</span>
      <span class="bench-count">({{ substitutes.length }})</span>
    </div>
    <div class="bench-chip-list">
      <div
        v-for="m in substitutes"
        :key="m.id"
        class="bench-member-chip"
        :style="getChipStyle(m)"
      >
        <img :src="getSchoolImgByName(m.currentSchool)" class="chip-school-icon" />
        <img
          v-if="showSecondarySchool && getSecondarySchool(m)"
          :src="getSchoolImgByName(getSecondarySchool(m))"
          class="chip-school-icon-sub"
        />
        <span class="chip-name">{{ m.name }}</span>
      </div>
    </div>
  </div>

  <!-- 編輯模式：候補 + 不出席 兩個席位區 -->
  <div v-else class="bench-zone-wrapper">
    <div
      v-for="zone in zoneDefs"
      :key="zone.key"
      :class="['bench-zone-box', zone.key]"
      @dragover.prevent
      @drop="canEdit && $emit('drop-bench', { zone: zone.key })"
    >
      <div class="bench-zone-head">
        <i :class="['mdi', zone.icon]"></i>
        <span class="bench-zone-title">{{ zone.title }}</span>
        <span class="bench-count">({{ getZoneList(zone.key).length }})</span>
        <span class="bench-zone-hint">{{ zone.hint }}</span>
      </div>

      <div class="bench-chip-list">
        <div
          v-for="(m, idx) in getZoneList(zone.key)"
          :key="m.id"
          class="bench-member-chip"
          :style="getChipStyle(m)"
          :draggable="canEdit"
          @dragstart="canEdit && $emit('drag-start-bench', { zone: zone.key, index: idx })"
          :title="canEdit ? '按住可拖拽至排表席位或另一區' : m.name"
        >
          <img :src="getSchoolImgByName(m.currentSchool)" class="chip-school-icon" />
          <img
            v-if="showSecondarySchool && getSecondarySchool(m)"
            :src="getSchoolImgByName(getSecondarySchool(m))"
            class="chip-school-icon-sub"
            title="副職業"
          />
          <span class="chip-name">{{ m.name }}</span>
          <span
            v-if="canEdit"
            class="chip-remove-x"
            title="移回待選成員"
            @click.stop="$emit('remove-bench', { zone: zone.key, index: idx })"
          >&times;</span>
        </div>

        <div v-if="getZoneList(zone.key).length === 0" class="bench-empty-text">
          {{ canEdit ? '將成員拖拽至此' : '無' }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  substitutes: { type: Array, default: () => [] },
  absentees: { type: Array, default: () => [] },
  availableSchools: { type: Array, default: () => [] },
  schoolColorMap: { type: Object, default: () => ({}) },
  showSecondarySchool: Boolean,
  canEdit: { type: Boolean, default: true },
  exportMode: Boolean
})

defineEmits(['drag-start-bench', 'drop-bench', 'remove-bench'])

const zoneDefs = [
  { key: 'substitutes', title: '候補', icon: 'mdi-account-clock-outline', hint: '不計入上陣統計，導出時可選擇顯示' },
  { key: 'absentees', title: '不出席', icon: 'mdi-account-cancel-outline', hint: '不計入上陣統計，導出時不顯示' }
]

const getZoneList = (key) => (key === 'absentees' ? props.absentees : props.substitutes) || []

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

const getChipStyle = (member) => {
  const bg = props.schoolColorMap[member?.currentSchool] || 'var(--c-surface-2)'
  return { backgroundColor: bg }
}
</script>

<style scoped>
.bench-zone-wrapper { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
.bench-zone-box { background: var(--c-surface); border: 1px dashed var(--c-border-strong); border-radius: 8px; padding: 8px 12px; min-height: 64px; display: flex; flex-direction: column; gap: 6px; transition: border-color 0.15s; }
.bench-zone-box:hover { border-color: #3b82f6; }
.bench-zone-box.substitutes { border-left: 3px solid #f59e0b; }
.bench-zone-box.absentees { border-left: 3px solid var(--c-faint); background: var(--c-surface-2); }

.bench-zone-head { display: flex; align-items: center; gap: 4px; font-size: 12px; color: var(--c-text-3); }
.bench-zone-head .mdi { font-size: 15px; color: var(--c-muted); }
.bench-zone-title { font-weight: bold; color: var(--c-text); }
.bench-count { color: var(--c-faint); }
.bench-zone-hint { margin-left: auto; font-size: 11px; color: var(--c-faint); }

.bench-chip-list { display: flex; flex-wrap: wrap; gap: 6px; }
.bench-member-chip { position: relative; display: flex; align-items: center; gap: 4px; padding: 4px 18px 4px 8px; border: 1px solid var(--c-border-strong); border-radius: 6px; font-size: 12px; cursor: grab; }
.chip-school-icon { width: 16px; height: 16px; object-fit: contain; }
.chip-school-icon-sub { width: 12px; height: 12px; object-fit: contain; opacity: 0.85; margin-left: -2px; }
.chip-name { font-weight: bold; color: var(--c-text); }
.chip-remove-x { position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 12px; color: var(--c-faint); cursor: pointer; opacity: 0; }
.bench-member-chip:hover .chip-remove-x { opacity: 1; }
.chip-remove-x:hover { color: #ef4444; }
.bench-empty-text { font-size: 11px; color: var(--c-faint-2); padding: 4px 0; }

.bench-export-card { margin-top: 16px; border: 1px solid var(--c-border-strong); border-radius: 6px; padding: 10px 14px; background: var(--c-surface); display: flex; flex-direction: column; gap: 8px; }
.bench-export-card .bench-member-chip { cursor: default; padding-right: 8px; }
.bench-export-head { display: flex; align-items: center; gap: 6px; font-size: 14px; font-weight: bold; color: var(--c-text); }
.bench-export-head .mdi { color: #f59e0b; font-size: 16px; }
</style>
