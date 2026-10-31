<template>
  <div class="title-panel">
    <div class="tp-head">
      <h3 class="tp-title"><i class="mdi mdi-trophy-outline"></i> 當場稱號</h3>
      <div class="tp-filter">
        <button v-for="f in FILTERS" :key="f.key" :class="{ active: filter === f.key }" @click="filter = f.key">{{ f.label }}</button>
      </div>
    </div>
    <div class="tp-list">
      <div v-for="t in titles" :key="t.key" class="tp-item">
        <i :class="['mdi', t.icon, 'tp-icon']"></i>
        <span class="tp-name">{{ t.title }}</span>
        <span :class="['tp-player', t.player.side]">
          <img v-if="schoolIcon(t.player.job)" :src="schoolIcon(t.player.job)" alt="" />{{ t.player.name }}
        </span>
        <span class="tp-value">{{ t.key === 'kills' || t.key === 'assists' || t.key === 'feather' || t.key === 'bone' ? t.value.toLocaleString() : formatStat(t.value) }}</span>
      </div>
      <p v-if="!titles.length" class="tp-empty">沒有數據</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { formatStat } from '../../../utils/matchStatsCsv'
import { pickTitles } from '../../../utils/matchMetrics'
import { SCHOOLS, getSchoolImg } from '../../../constants/schools'

const props = defineProps({
  my: { type: Array, required: true },
  opp: { type: Array, required: true }
})

const FILTERS = [{ key: 'all', label: '全場' }, { key: 'my', label: '我方' }, { key: 'opp', label: '對方' }]
const filter = ref('all')

const schoolIcon = (job) => getSchoolImg(SCHOOLS.find(s => s.name === job)?.file)

const titles = computed(() => {
  const my = props.my.map(p => ({ ...p, side: 'my' }))
  const opp = props.opp.map(p => ({ ...p, side: 'opp' }))
  return pickTitles(filter.value === 'my' ? my : filter.value === 'opp' ? opp : [...my, ...opp])
})
</script>

<style scoped>
.title-panel { display: flex; flex-direction: column; gap: 10px; }
.tp-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
.tp-title { margin: 0; font-size: 14px; color: var(--c-text); display: flex; align-items: center; gap: 4px; }
.tp-filter { display: flex; border: 1px solid var(--c-border-strong); border-radius: 6px; overflow: hidden; }
.tp-filter button { background: var(--c-surface); border: none; color: var(--c-muted); font-size: 12px; padding: 3px 10px; cursor: pointer; }
.tp-filter button + button { border-left: 1px solid var(--c-border-strong); }
.tp-filter button.active { background: var(--c-primary-soft); color: var(--c-primary-text); font-weight: bold; }
.tp-list { display: flex; flex-direction: column; }
.tp-item { display: grid; grid-template-columns: 22px 56px 1fr auto; align-items: center; gap: 6px; padding: 7px 4px; border-bottom: 1px dashed var(--c-border); font-size: 13px; }
.tp-item:last-child { border-bottom: none; }
.tp-icon { color: #f59e0b; font-size: 17px; }
.tp-name { color: var(--c-muted); font-size: 12px; }
.tp-player { font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: flex; align-items: center; gap: 4px; }
.tp-player img { width: 18px; height: 18px; }
.tp-player.my { color: #3b82f6; }
.tp-player.opp { color: #ef4444; }
.tp-value { font-weight: bold; color: var(--c-text); font-variant-numeric: tabular-nums; }
.tp-empty { color: var(--c-faint); font-size: 12px; text-align: center; }
</style>
