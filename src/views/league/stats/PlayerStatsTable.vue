<template>
  <div class="pst">
    <!-- 分頁：總覽、擊殺、輸出…、職業 -->
    <div class="section-tabs">
      <button
        v-for="s in sections"
        :key="s.key"
        :class="['section-tab', { active: sectionKey === s.key }]"
        @click="selectSection(s.key)"
      ><i :class="['mdi', s.icon]"></i>{{ s.label }}</button>
    </div>

    <div class="pst-tools">
      <div class="job-icons">
        <button :class="['job-icon-btn', 'all', { active: !jobFilter }]" @click="jobFilter = ''">全部 <b>{{ baseRows.length }}</b></button>
        <button
          v-for="j in jobCounts"
          :key="j.job"
          :class="['job-icon-btn', { active: jobFilter === j.job }]"
          :title="j.job"
          @click="jobFilter = jobFilter === j.job ? '' : j.job"
        >
          <img v-if="schoolIcon(j.job)" :src="schoolIcon(j.job)" alt="" />
          <span v-else>{{ j.job }}</span>
          <b>{{ j.count }}</b>
        </button>
      </div>
      <div class="pst-right">
        <select v-if="teamOptions.length > 1" v-model="teamFilter" class="team-select" title="依排表團隊篩選">
          <option value="">全部團隊</option>
          <option v-for="t in teamOptions" :key="t" :value="t">{{ t }}</option>
        </select>
        <input v-model="search" class="search-input" placeholder="搜尋玩家" />
        <button class="btn-tool" title="下載目前表格為 CSV" @click="exportCsv"><i class="mdi mdi-file-delimited-outline"></i> CSV</button>
      </div>
    </div>

    <!-- 職業彙整 -->
    <div v-if="sectionKey === 'jobs'" class="table-scroll">
      <table class="stat-table">
        <thead>
          <tr>
            <th class="left">職業</th>
            <th>人數</th>
            <th v-for="f in JOB_COLUMNS" :key="f.key">平均{{ f.label }}</th>
            <th>總玩家傷害</th>
            <th>總治療</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in jobRows" :key="r.job">
            <td class="left job-cell"><img v-if="schoolIcon(r.job)" :src="schoolIcon(r.job)" alt="" />{{ r.job }}</td>
            <td>{{ r.count }}</td>
            <td v-for="f in JOB_COLUMNS" :key="f.key">{{ fmtValue(r.avg[f.key], f.fmt) }}</td>
            <td>{{ formatStat(r.totals.pvp) }}</td>
            <td>{{ formatStat(r.totals.heal) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 玩家明細 -->
    <div v-else class="table-scroll">
      <table class="stat-table">
        <thead>
          <tr>
            <th class="rank">#</th>
            <th class="left">玩家</th>
            <th class="left">職業</th>
            <th v-if="hasTeams" class="left">團隊</th>
            <th
              v-for="c in section.columns"
              :key="c.key"
              :class="['sortable', { sorted: sortKey === c.key }]"
              :title="c.hint || ''"
              @click="toggleSort(c.key)"
            >{{ c.label }}<i v-if="c.hint" class="mdi mdi-information-outline col-hint"></i><span v-if="sortKey === c.key">{{ sortDesc ? ' ▼' : ' ▲' }}</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(p, i) in rows" :key="p.name + '_' + i">
            <td class="rank"><span :class="['rank-badge', 'r' + (i + 1)]">{{ i + 1 }}</span></td>
            <td class="left name-cell">
              {{ p.name }}
              <span v-if="tagOf && tagOf(p.name)" :class="['name-tag', { warn: tagOf(p.name).warn }]">{{ tagOf(p.name).text }}</span>
            </td>
            <td class="left job-cell"><img v-if="schoolIcon(p.job)" :src="schoolIcon(p.job)" alt="" />{{ p.job }}</td>
            <td v-if="hasTeams" class="left team-cell">{{ teamOf(p.name) || '—' }}</td>
            <td
              v-for="c in section.columns"
              :key="c.key"
              :class="['num', { zero: !p[c.key], bar: c.bar && p[c.key] }]"
              :style="c.bar ? barStyle(p[c.key], c) : null"
            >{{ fmtValue(p[c.key], c.fmt) }}</td>
          </tr>
          <tr v-if="rows.length === 0">
            <td :colspan="(hasTeams ? 4 : 3) + section.columns.length" class="empty-cell">沒有符合條件的玩家</td>
          </tr>
        </tbody>
        <tfoot v-if="rows.length">
          <tr>
            <td></td>
            <td class="left">合計 {{ rows.length }} 人</td>
            <td></td>
            <td v-if="hasTeams"></td>
            <td v-for="c in section.columns" :key="c.key">{{ footValue(c) }}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { formatStat, STAT_FIELDS } from '../../../utils/matchStatsCsv'
import { REPORT_SECTIONS, withDerived, jobSummary, formatPct, sumBy } from '../../../utils/matchMetrics'
import { SCHOOLS, getSchoolImg } from '../../../constants/schools'

const props = defineProps({
  players: { type: Array, required: true },
  side: { type: String, default: 'my' },
  sideName: { type: String, default: '' },
  // 我方才有：玩家 → 排表團隊名稱、成員對應標籤
  teamOf: { type: Function, default: null },
  tagOf: { type: Function, default: null },
  fileLabel: { type: String, default: '戰績' }
})

const JOB_COLUMNS = [
  { key: 'kills', label: '擊敗', fmt: 'dec' }, { key: 'pvp', label: '玩傷', fmt: 'stat' },
  { key: 'bld', label: '塔傷', fmt: 'stat' }, { key: 'heal', label: '治療', fmt: 'stat' },
  { key: 'tank', label: '承傷', fmt: 'stat' }, { key: 'heavy', label: '重傷', fmt: 'dec' }
]

const sections = [...REPORT_SECTIONS, { key: 'jobs', label: '職業', icon: 'mdi-account-group' }]
const sectionKey = ref('overview')
const section = computed(() => REPORT_SECTIONS.find(s => s.key === sectionKey.value) || REPORT_SECTIONS[0])
const jobFilter = ref('')
const teamFilter = ref('')
const search = ref('')
const sortKey = ref('pvp')
const sortDesc = ref(true)

const schoolIcon = (job) => getSchoolImg(SCHOOLS.find(s => s.name === job)?.file)

// 佔比以整方為基準，不受篩選影響
const allRows = computed(() => withDerived(props.players))
// 素問、焚骨頁只看該職業
const baseRows = computed(() => section.value.jobs ? allRows.value.filter(p => section.value.jobs.includes(p.job)) : allRows.value)

const jobCounts = computed(() => {
  const counts = {}
  baseRows.value.forEach(p => { counts[p.job] = (counts[p.job] || 0) + 1 })
  return Object.entries(counts).map(([job, count]) => ({ job, count }))
    .sort((a, b) => SCHOOLS.findIndex(s => s.name === a.job) - SCHOOLS.findIndex(s => s.name === b.job))
})

const hasTeams = computed(() => !!props.teamOf && props.players.some(p => props.teamOf(p.name)))
const teamOptions = computed(() => {
  if (!hasTeams.value) return []
  return [...new Set(props.players.map(p => props.teamOf(p.name) || '未排表'))]
})

const rows = computed(() => {
  const keyword = search.value.trim()
  const col = section.value.columns.find(c => c.key === sortKey.value)
  const dir = sortDesc.value ? -1 : 1
  return baseRows.value
    .filter(p => !jobFilter.value || p.job === jobFilter.value)
    .filter(p => !teamFilter.value || (props.teamOf(p.name) || '未排表') === teamFilter.value)
    .filter(p => !keyword || p.name.includes(keyword))
    .sort((a, b) => ((Number(a[sortKey.value]) || 0) - (Number(b[sortKey.value]) || 0)) * dir || (col ? 0 : 0))
})

const jobRows = computed(() => jobSummary(props.players.filter(p => !teamFilter.value || (props.teamOf?.(p.name) || '未排表') === teamFilter.value)))

const selectSection = (key) => {
  sectionKey.value = key
  const s = REPORT_SECTIONS.find(x => x.key === key)
  if (s) {
    const col = s.columns.find(c => c.key === s.sort)
    sortKey.value = s.sort
    // 重傷救援頁預設由多到少，先看重傷最多的人
    sortDesc.value = s.sortDesc ?? !col?.lowerIsBetter
  }
  if (s?.jobs) jobFilter.value = ''
}

const toggleSort = (key) => {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value
  else { sortKey.value = key; sortDesc.value = !section.value.columns.find(c => c.key === key)?.lowerIsBetter }
}

// 比例條：以目前顯示的玩家中最大值為 100%
const maxOf = computed(() => Object.fromEntries(section.value.columns.map(c => [c.key, Math.max(0, ...rows.value.map(p => Number(p[c.key]) || 0))])))
const barStyle = (value, c) => {
  const max = maxOf.value[c.key]
  const pct = max ? Math.round(((Number(value) || 0) / max) * 100) : 0
  const color = c.lowerIsBetter ? 'var(--bar-warn)' : (props.side === 'opp' ? 'var(--bar-opp)' : 'var(--bar-my)')
  return { backgroundImage: `linear-gradient(to right, ${color} ${pct}%, transparent ${pct}%)` }
}

const fmtValue = (v, fmt) => {
  const n = Number(v) || 0
  if (fmt === 'pct') return formatPct(n)
  if (!n) return '—'
  if (fmt === 'diff') return (n > 0 ? '+' : '') + n
  if (fmt === 'dec') return Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1)
  if (fmt === 'int') return n.toLocaleString()
  return formatStat(Math.round(n))
}

const footValue = (c) => {
  if (STAT_FIELDS.some(f => f.key === c.key) || c.key === 'ka' || c.key === 'rescueDiff') return fmtValue(sumBy(rows.value, c.key), c.fmt === 'pct' ? 'int' : c.fmt)
  if (c.fmt === 'pct') return formatPct(rows.value.reduce((s, p) => s + (Number(p[c.key]) || 0), 0))
  return ''
}

// 下載目前篩選的玩家（含原始十項數據）
const exportCsv = () => {
  const cols = [...STAT_FIELDS.map(f => [f.key, f.label])]
  const header = ['玩家', '職業', ...(hasTeams.value ? ['團隊'] : []), ...cols.map(c => c[1])]
  const list = sectionKey.value === 'jobs' ? baseRows.value : rows.value
  const lines = list.map(p => [p.name, p.job, ...(hasTeams.value ? [props.teamOf(p.name) || ''] : []), ...cols.map(c => Number(p[c[0]]) || 0)])
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`
  const csv = '﻿' + [header, ...lines].map(r => r.map(esc).join(',')).join('\r\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.fileLabel}_${props.sideName || props.side}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

watch(() => props.players, () => { jobFilter.value = ''; teamFilter.value = '' })
</script>

<style scoped>
.pst { display: flex; flex-direction: column; gap: 10px; --bar-my: rgba(59, 130, 246, 0.16); --bar-opp: rgba(239, 68, 68, 0.15); --bar-warn: rgba(245, 158, 11, 0.18); }
.section-tabs { display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid var(--c-border); padding-bottom: 8px; }
.section-tab { background: none; border: 1px solid transparent; color: var(--c-text-3); padding: 5px 12px; border-radius: 8px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
.section-tab:hover { background: var(--c-surface-3); }
.section-tab.active { background: var(--c-primary-soft); border-color: var(--c-primary-border); color: var(--c-primary-text); font-weight: bold; }

.pst-tools { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.job-icons { display: flex; flex-wrap: wrap; gap: 6px; }
.job-icon-btn { display: inline-flex; align-items: center; gap: 4px; border: 1px solid var(--c-border-strong); background: var(--c-surface); color: var(--c-text-3); border-radius: 16px; padding: 3px 9px 3px 5px; font-size: 12px; cursor: pointer; }
.job-icon-btn.all { padding-left: 10px; }
.job-icon-btn img { width: 20px; height: 20px; }
.job-icon-btn b { font-size: 12px; }
.job-icon-btn.active { border-color: #3b82f6; background: var(--c-primary-soft); color: var(--c-primary-text); }
.pst-right { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.team-select, .search-input { border: 1px solid var(--c-border-strong); border-radius: 6px; padding: 6px 10px; font-size: 13px; }
.search-input { width: 150px; }
.btn-tool { border: 1px solid var(--c-border-strong); background: var(--c-surface); color: var(--c-text-2); border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
.btn-tool:hover { background: var(--c-surface-3); }

.table-scroll { overflow-x: auto; }
.stat-table { width: 100%; border-collapse: collapse; font-size: 12.5px; white-space: nowrap; }
.stat-table th, .stat-table td { padding: 7px 10px; border-bottom: 1px solid var(--c-border-soft); text-align: right; }
.stat-table th { background: var(--c-surface-2); color: var(--c-muted); font-weight: 600; position: sticky; top: 0; }
.stat-table .left { text-align: left; }
.stat-table tbody tr:hover td { background-color: var(--c-surface-2); }
.stat-table td.num.bar { background-repeat: no-repeat; }
.stat-table td.zero { color: var(--c-faint-2); }
.stat-table tfoot td { font-weight: bold; background: var(--c-surface-2); color: var(--c-text); }
.sortable { cursor: pointer; user-select: none; }
.sortable.sorted { color: var(--c-primary-text); }
.col-hint { font-size: 11px; margin-left: 2px; opacity: 0.7; }
.rank { width: 36px; text-align: center !important; }
.rank-badge { display: inline-block; min-width: 22px; padding: 1px 0; border-radius: 6px; color: var(--c-faint); font-size: 11px; text-align: center; }
.rank-badge.r1 { background: #f59e0b; color: #ffffff; font-weight: bold; }
.rank-badge.r2 { background: #94a3b8; color: #ffffff; font-weight: bold; }
.rank-badge.r3 { background: #b45309; color: #ffffff; font-weight: bold; }
.name-cell { font-weight: bold; color: var(--c-text); }
.job-cell { color: var(--c-text-3); }
.job-cell img { width: 18px; height: 18px; vertical-align: -4px; margin-right: 4px; }
.team-cell { color: var(--c-muted); font-size: 12px; }
.name-tag { margin-left: 6px; font-size: 10px; font-weight: normal; color: var(--c-muted); background: var(--c-surface-3); padding: 1px 6px; border-radius: 8px; }
.name-tag.warn { color: var(--c-warn-text); background: var(--c-warn-soft); }
.empty-cell { text-align: center !important; color: var(--c-faint); padding: 24px; }

@media (max-width: 640px) {
  .search-input { width: 100%; }
  .pst-right { width: 100%; }
}
</style>
