<template>
  <div ref="exportArea" class="export-area">
    <!-- 計分板 -->
    <div class="scoreboard">
      <div class="sb-side my">
        <div class="sb-name">{{ record.my_name }}</div>
        <div class="sb-meta">{{ record.my_players.length }} 人<span :class="['sb-result', sideResult('my').cls]">{{ sideResult('my').text }}</span></div>
      </div>
      <div class="sb-center">
        <div class="sb-vs">VS</div>
        <div class="sb-time">{{ record.played_at ? formatDateTime(record.played_at) : fallbackTime }}</div>
        <div v-if="subtitle" class="sb-league">{{ subtitle }}</div>
      </div>
      <div class="sb-side opp">
        <div class="sb-name">{{ record.opp_name }}</div>
        <div class="sb-meta"><span :class="['sb-result', sideResult('opp').cls]">{{ sideResult('opp').text }}</span>{{ record.opp_players.length }} 人</div>
      </div>
      <div class="sb-totals">
        <div v-for="row in headlineRows" :key="row.key" class="sb-total">
          <span :class="['sb-num', 'my', { lead: row.myLeads }]">{{ formatStat(row.my) }}</span>
          <span class="sb-label">{{ row.label }}</span>
          <span :class="['sb-num', 'opp', { lead: row.oppLeads }]">{{ formatStat(row.opp) }}</span>
        </div>
      </div>
    </div>

    <!-- 檢視切換（導出圖片時不含這一列） -->
    <div class="view-bar" data-html2canvas-ignore="true">
      <div class="view-tabs">
        <button v-for="v in views" :key="v.key" :class="['view-tab', { active: view === v.key }]" @click="view = v.key">
          <i :class="['mdi', v.icon]"></i>{{ v.label }}
          <span v-if="v.badge" class="view-badge">{{ v.badge }}</span>
        </button>
      </div>
      <div class="view-actions">
        <button class="btn-tool" :disabled="isExporting" title="把目前畫面存成圖片（亮色）" @click="exportImage"><i class="mdi mdi-image-outline"></i> {{ isExporting ? '產生中...' : '導出圖片' }}</button>
        <slot name="actions" />
      </div>
    </div>

    <!-- 雙方對比 -->
    <template v-if="view === 'compare'">
      <div class="compare-grid">
        <div class="card">
          <h3 class="card-title"><i class="mdi mdi-scale-balance"></i> 數據對比</h3>
          <div class="vs-rows">
            <div v-for="row in comparisonRows" :key="row.key" class="vs-row">
              <span :class="['vs-val', 'left', { lead: row.myLeads }]">{{ formatStat(row.my) }}</span>
              <div class="vs-mid">
                <div class="vs-label">{{ row.label }}</div>
                <div class="vs-bar">
                  <div class="bar-my" :style="{ width: row.myPct + '%' }"></div>
                  <div class="bar-opp" :style="{ width: (100 - row.myPct) + '%' }"></div>
                </div>
              </div>
              <span :class="['vs-val', 'right', { lead: row.oppLeads }]">{{ formatStat(row.opp) }}</span>
            </div>
          </div>
        </div>
        <div class="card">
          <TitlePanel :my="record.my_players" :opp="record.opp_players" />
        </div>
      </div>
      <div class="card">
        <JobCompare :my="record.my_players" :opp="record.opp_players" />
      </div>
    </template>

    <!-- 我方／對方明細 -->
    <div v-else-if="view === 'my' || view === 'opp'" class="card">
      <PlayerStatsTable
        :key="view"
        :players="view === 'my' ? record.my_players : record.opp_players"
        :side="view"
        :side-name="view === 'my' ? record.my_name : record.opp_name"
        :team-of="view === 'my' ? teamOf : null"
        :tag-of="view === 'my' ? tagOf : null"
        :file-label="fileLabel"
      />
    </div>

    <!-- 其他檢視（例如聯賽的出勤對照），由使用的頁面提供 -->
    <slot v-else name="extra" :view="view" />
  </div>
</template>

<script setup>
// 單場戰績報告：計分板、雙方對比、雙方明細、導出圖片
// 聯賽數據頁與快速分析、分享頁共用；聯賽專屬的出勤對照透過 extraViews＋extra 插槽加入
import { ref, computed } from 'vue'
import { formatStat, STAT_FIELDS } from '../../../utils/matchStatsCsv'
import { notify } from '../../../utils/notify'
import PlayerStatsTable from './PlayerStatsTable.vue'
import TitlePanel from './TitlePanel.vue'
import JobCompare from './JobCompare.vue'

const props = defineProps({
  // { my_name, opp_name, my_players, opp_players, played_at }
  record: { type: Object, required: true },
  // 我方勝負：win、loss，空字串為未填
  result: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  fallbackTime: { type: String, default: '' },
  fileLabel: { type: String, default: '戰績' },
  teamOf: { type: Function, default: null },
  tagOf: { type: Function, default: null },
  // [{ key, label, icon, badge }]
  extraViews: { type: Array, default: () => [] }
})

const BASE_VIEWS = [
  { key: 'compare', label: '雙方對比', icon: 'mdi-scale-balance' },
  { key: 'my', label: '我方明細', icon: 'mdi-shield-account' },
  { key: 'opp', label: '對方明細', icon: 'mdi-sword' }
]
const views = computed(() => [...BASE_VIEWS, ...props.extraViews])
const view = ref('compare')
const exportArea = ref(null)
const isExporting = ref(false)

const sideResult = (side) => {
  if (props.result !== 'win' && props.result !== 'loss') return { text: '未填結果', cls: 'pending' }
  return (side === 'my') === (props.result === 'win') ? { text: '勝利', cls: 'win' } : { text: '敗北', cls: 'loss' }
}

const sumOf = (players, key) => players.reduce((s, p) => s + (Number(p[key]) || 0), 0)

const comparisonRows = computed(() => STAT_FIELDS.map(f => {
  const my = sumOf(props.record.my_players, f.key)
  const opp = sumOf(props.record.opp_players, f.key)
  const myPct = my + opp > 0 ? Math.round((my / (my + opp)) * 100) : 50
  // 重傷越少越好，粗體標示表現較好的一方
  const myLeads = f.lowerIsBetter ? my < opp : my > opp
  const oppLeads = f.lowerIsBetter ? opp < my : opp > my
  return { ...f, my, opp, myPct, myLeads, oppLeads }
}))

// 計分板只顯示幾項重點
const headlineRows = computed(() => comparisonRows.value.filter(r => ['kills', 'pvp', 'bld', 'heal'].includes(r.key)))

const formatDateTime = (value) => {
  const d = new Date(value)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 把計分板與目前檢視存成圖片（一律亮色，方便分享）
const exportImage = async () => {
  if (!exportArea.value || isExporting.value) return
  isExporting.value = true
  try {
    const html2canvas = (await import('html2canvas')).default
    const canvas = await html2canvas(exportArea.value, {
      scale: 2,
      backgroundColor: '#f4f6f9',
      logging: false,
      onclone: (doc) => { doc.documentElement.dataset.theme = 'light' }
    })
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    const viewLabel = views.value.find(v => v.key === view.value)?.label || ''
    a.download = `${props.fileLabel}_${viewLabel}.png`
    a.click()
  } catch (err) {
    notify('導出圖片失敗：' + err.message)
  } finally {
    isExporting.value = false
  }
}

defineExpose({ view })
</script>

<style scoped>
.export-area { display: flex; flex-direction: column; gap: 14px; }
.card { background: var(--c-surface); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); padding: 16px; }
.card-title { margin: 0 0 12px; font-size: 14px; color: var(--c-text); display: flex; align-items: center; gap: 4px; }

/* 計分板 */
.scoreboard { display: grid; grid-template-columns: 1fr auto 1fr; gap: 10px 18px; align-items: center; padding: 18px 20px; border-radius: 12px; background: linear-gradient(90deg, rgba(59, 130, 246, 0.10), var(--c-surface) 35%, var(--c-surface) 65%, rgba(239, 68, 68, 0.10)); border: 1px solid var(--c-border); }
.sb-side { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.sb-side.my { align-items: flex-start; }
.sb-side.opp { align-items: flex-end; text-align: right; }
.sb-name { font-size: 20px; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; }
.sb-side.my .sb-name { color: #3b82f6; }
.sb-side.opp .sb-name { color: #ef4444; }
.sb-meta { font-size: 12px; color: var(--c-muted); display: flex; gap: 8px; align-items: center; }
.sb-result { padding: 1px 10px; border-radius: 10px; font-weight: bold; font-size: 12px; }
.sb-result.win { background: #3b82f6; color: #ffffff; }
.sb-result.loss { background: #ef4444; color: #ffffff; }
.sb-result.pending { background: var(--c-surface-4); color: var(--c-muted); }
.sb-center { text-align: center; }
.sb-vs { font-size: 22px; font-weight: 900; letter-spacing: 2px; color: var(--c-faint); }
.sb-time { font-size: 12px; color: var(--c-text-3); }
.sb-league { font-size: 11px; color: var(--c-faint); }
.sb-totals { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; padding-top: 10px; border-top: 1px dashed var(--c-border); }
.sb-total { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 6px; font-size: 13px; }
.sb-label { color: var(--c-muted); font-size: 12px; }
.sb-num { color: var(--c-faint); font-variant-numeric: tabular-nums; }
.sb-num.my { text-align: right; }
.sb-num.lead.my { color: #3b82f6; font-weight: bold; }
.sb-num.lead.opp { color: #ef4444; font-weight: bold; }

/* 檢視切換 */
.view-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.view-tabs { display: flex; gap: 4px; background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 10px; padding: 4px; flex-wrap: wrap; }
.view-tab { border: none; background: none; color: var(--c-text-3); padding: 6px 14px; border-radius: 7px; font-size: 13px; cursor: pointer; display: inline-flex; align-items: center; gap: 5px; }
.view-tab:hover { background: var(--c-surface-3); }
.view-tab.active { background: #3b82f6; color: #ffffff; font-weight: bold; }
.view-badge { background: #f59e0b; color: #ffffff; border-radius: 9px; font-size: 10px; padding: 0 6px; font-weight: bold; }
.view-actions { display: flex; gap: 8px; flex-wrap: wrap; }
.btn-tool { border: 1px solid var(--c-border-strong); background: var(--c-surface); color: var(--c-text-2); border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
.btn-tool:hover { background: var(--c-surface-3); }
.btn-tool:disabled { opacity: 0.6; cursor: not-allowed; }

/* 雙方對比 */
.compare-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr); gap: 14px; }
.vs-rows { display: flex; flex-direction: column; gap: 8px; }
.vs-row { display: grid; grid-template-columns: 80px 1fr 80px; align-items: center; gap: 10px; }
.vs-val { font-size: 13px; color: var(--c-faint); }
.vs-val.left { text-align: right; }
.vs-val.lead { color: var(--c-text); font-weight: bold; }
.vs-label { text-align: center; font-size: 12px; color: var(--c-muted); margin-bottom: 3px; }
.vs-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--c-surface-3); }
.bar-my { background: #3b82f6; }
.bar-opp { background: #ef4444; }

@media (max-width: 900px) {
  .compare-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .scoreboard { padding: 14px; }
  .sb-name { font-size: 16px; }
  .sb-totals { grid-template-columns: repeat(2, 1fr); }
  .vs-row { grid-template-columns: 64px 1fr 64px; }
}
</style>
