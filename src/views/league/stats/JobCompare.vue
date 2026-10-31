<template>
  <div class="job-compare">
    <h3 class="jc-title"><i class="mdi mdi-account-group"></i> 職業對比 <small>每格為「我方 ｜ 對方」的每人平均，較好的一方加粗</small></h3>
    <div class="table-scroll">
      <table class="jc-table">
        <thead>
          <tr>
            <th class="left">職業</th>
            <th>人數</th>
            <th v-for="c in COLUMNS" :key="c.key">{{ c.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rows" :key="r.job">
            <td class="left job-cell"><img v-if="schoolIcon(r.job)" :src="schoolIcon(r.job)" alt="" />{{ r.job }}</td>
            <td class="pair"><span class="my">{{ r.my?.count || 0 }}</span><span class="sep">｜</span><span class="opp">{{ r.opp?.count || 0 }}</span></td>
            <td v-for="c in COLUMNS" :key="c.key" class="pair">
              <span :class="['my', { lead: better(r, c) === 'my' }]">{{ fmt(r.my?.avg[c.key], c) }}</span><span class="sep">｜</span><span :class="['opp', { lead: better(r, c) === 'opp' }]">{{ fmt(r.opp?.avg[c.key], c) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { formatStat } from '../../../utils/matchStatsCsv'
import { jobSummary } from '../../../utils/matchMetrics'
import { SCHOOLS, getSchoolImg } from '../../../constants/schools'

const props = defineProps({
  my: { type: Array, required: true },
  opp: { type: Array, required: true }
})

const COLUMNS = [
  { key: 'kills', label: '擊敗', dec: true }, { key: 'assists', label: '助攻', dec: true },
  { key: 'pvp', label: '玩家傷害' }, { key: 'bld', label: '建築傷害' },
  { key: 'heal', label: '治療' }, { key: 'tank', label: '承傷' },
  { key: 'heavy', label: '重傷', dec: true, lowerIsBetter: true }
]

const schoolIcon = (job) => getSchoolImg(SCHOOLS.find(s => s.name === job)?.file)

const rows = computed(() => {
  const my = Object.fromEntries(jobSummary(props.my).map(r => [r.job, r]))
  const opp = Object.fromEntries(jobSummary(props.opp).map(r => [r.job, r]))
  const jobs = [...new Set([...Object.keys(my), ...Object.keys(opp)])]
    .sort((a, b) => SCHOOLS.findIndex(s => s.name === a) - SCHOOLS.findIndex(s => s.name === b))
  return jobs.map(job => ({ job, my: my[job], opp: opp[job] }))
})

const better = (r, c) => {
  if (!r.my || !r.opp) return ''
  const a = r.my.avg[c.key]
  const b = r.opp.avg[c.key]
  if (a === b) return ''
  return (c.lowerIsBetter ? a < b : a > b) ? 'my' : 'opp'
}

const fmt = (v, c) => {
  if (v === undefined) return '—'
  const n = Number(v) || 0
  if (!n) return '0'
  if (c.dec) return Number.isInteger(n) ? String(n) : n.toFixed(1)
  return formatStat(Math.round(n))
}
</script>

<style scoped>
.job-compare { display: flex; flex-direction: column; gap: 10px; }
.jc-title { margin: 0; font-size: 14px; color: var(--c-text); display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
.jc-title small { font-weight: normal; color: var(--c-faint); font-size: 12px; margin-left: 6px; }
.table-scroll { overflow-x: auto; }
.jc-table { width: 100%; border-collapse: collapse; font-size: 12.5px; white-space: nowrap; }
.jc-table th, .jc-table td { padding: 7px 10px; border-bottom: 1px solid var(--c-border-soft); text-align: center; }
.jc-table th { background: var(--c-surface-2); color: var(--c-muted); font-weight: 600; }
.jc-table .left { text-align: left; }
.job-cell { font-weight: bold; color: var(--c-text); }
.job-cell img { width: 20px; height: 20px; vertical-align: -5px; margin-right: 6px; }
.pair .my { color: #3b82f6; }
.pair .opp { color: #ef4444; }
.pair .sep { color: var(--c-faint-2); margin: 0 4px; }
.pair span:not(.lead):not(.sep) { opacity: 0.7; }
.pair .lead { font-weight: bold; opacity: 1; }
</style>
