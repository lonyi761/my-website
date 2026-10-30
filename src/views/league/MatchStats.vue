<template>
  <div class="stats-page">
    <div class="stats-header">
      <div class="header-left">
        <button class="btn-back" @click="emit('back')">&lt; 返回聯賽列表</button>
        <div>
          <h2 class="page-title">{{ leagueItem.title }} · 戰績數據</h2>
          <div class="sub-text">{{ leagueItem.guild }} · {{ leagueItem.type }} · {{ leagueItem.startTime }}</div>
        </div>
      </div>
    </div>

    <!-- 場次切換 -->
    <div class="match-tabs">
      <button
        v-for="(opp, idx) in opponents"
        :key="'tab_' + idx"
        :class="['match-tab', { active: activeIndex === idx }]"
        @click="activeIndex = idx"
      >
        第{{ idx + 1 }}場 · {{ opp || '未填選' }}
        <span v-if="statsByIndex[idx]" class="tab-dot" title="已上傳戰績"></span>
      </button>
    </div>

    <div v-if="isLoading" class="empty-card">讀取中...</div>

    <!-- 尚未上傳 -->
    <div v-else-if="!current" class="empty-card">
      <i class="mdi mdi-file-chart-outline empty-icon"></i>
      <p>第{{ activeIndex + 1 }}場還沒有戰績數據。</p>
      <template v-if="canEdit">
        <p class="hint">比賽結束後在遊戲內下載戰績 CSV（存在電腦的 <code>AppData\LocalLow\netease\逆水寒</code> 資料夾），再上傳到這裡。</p>
        <button class="btn-primary" @click="pickFile">上傳戰績 CSV</button>
      </template>
      <p v-else class="hint">需要該幫會的編輯權限才能上傳。</p>
    </div>

    <template v-else>
      <!-- 檔案資訊 -->
      <div class="info-bar">
        <span><i class="mdi mdi-file-delimited-outline"></i> {{ current.file_name || '（未記錄檔名）' }}</span>
        <span v-if="current.played_at">比賽時間：{{ formatDateTime(current.played_at) }}</span>
        <span :class="['result-badge', resultBadgeClass]">{{ leagueItem.results?.[activeIndex] || '還沒出' }}</span>
        <div v-if="canEdit" class="info-actions">
          <button class="btn-secondary" @click="pickFile">重新上傳</button>
          <button class="btn-link text-red" @click="deleteStats">刪除數據</button>
        </div>
      </div>

      <!-- 雙方對比 -->
      <div class="card">
        <div class="vs-head">
          <span class="side-name my">{{ current.my_name }}（{{ current.my_players.length }} 人）</span>
          <span class="vs-mark">VS</span>
          <span class="side-name opp">{{ current.opp_name }}（{{ current.opp_players.length }} 人）</span>
        </div>
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

        <div class="job-compare">
          <div v-for="side in jobBreakdown" :key="side.key" class="job-line">
            <span :class="['job-side', side.key]">{{ side.key === 'my' ? '我方' : '對方' }}職業</span>
            <span v-for="j in side.jobs" :key="j.job" class="job-chip">{{ j.job }} {{ j.count }}</span>
          </div>
        </div>
      </div>

      <!-- 各項最高 -->
      <div class="card">
        <h3 class="card-title">各項最高</h3>
        <div class="mvp-grid">
          <div v-for="m in mvpList" :key="m.key" class="mvp-item">
            <span class="mvp-label">{{ m.label }}</span>
            <span :class="['mvp-name', m.side]">{{ m.name }}</span>
            <span class="mvp-job">{{ m.job }}</span>
            <span class="mvp-val">{{ formatStat(m.value) }}</span>
          </div>
        </div>
      </div>

      <!-- 玩家明細 -->
      <div class="card">
        <div class="table-tools">
          <div class="pill-group">
            <button :class="['pill', { active: tableSide === 'my' }]" @click="tableSide = 'my'">我方 {{ current.my_name }}</button>
            <button :class="['pill', { active: tableSide === 'opp' }]" @click="tableSide = 'opp'">對方 {{ current.opp_name }}</button>
          </div>
          <input v-model="searchName" class="search-input" placeholder="搜尋玩家" />
        </div>
        <div class="pill-group job-filter">
          <button :class="['pill', 'small', { active: !jobFilter }]" @click="jobFilter = ''">全部職業</button>
          <button
            v-for="j in tableJobs"
            :key="j"
            :class="['pill', 'small', { active: jobFilter === j }]"
            @click="jobFilter = jobFilter === j ? '' : j"
          >{{ j }}</button>
        </div>

        <div class="table-scroll">
          <table class="player-table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-name">玩家</th>
                <th>職業</th>
                <th
                  v-for="f in STAT_FIELDS"
                  :key="f.key"
                  :class="['sortable', { sorted: sortKey === f.key }]"
                  @click="toggleSort(f.key)"
                >{{ f.label }}<span v-if="sortKey === f.key">{{ sortDesc ? ' ▼' : ' ▲' }}</span></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in tableRows" :key="p.name + '_' + i">
                <td class="col-rank">{{ i + 1 }}</td>
                <td class="col-name">{{ p.name }}</td>
                <td>{{ p.job }}</td>
                <td v-for="f in STAT_FIELDS" :key="f.key" :class="{ zero: !p[f.key] }">{{ p[f.key] ? formatStat(p[f.key]) : '—' }}</td>
              </tr>
              <tr v-if="tableRows.length === 0">
                <td :colspan="3 + STAT_FIELDS.length" class="empty-cell">沒有符合條件的玩家</td>
              </tr>
            </tbody>
            <tfoot v-if="tableRows.length">
              <tr>
                <td></td>
                <td class="col-name">合計</td>
                <td>{{ tableRows.length }} 人</td>
                <td v-for="f in STAT_FIELDS" :key="f.key">{{ formatStat(sumOf(tableRows, f.key)) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </template>

    <input ref="fileInput" type="file" accept=".csv" class="hidden-input" @change="onFileChosen" />

    <!-- 上傳確認 -->
    <div v-if="pending" class="modal-overlay" @click.self="pending = null">
      <div class="modal-card">
        <div class="modal-header">
          <h3>確認上傳：第{{ activeIndex + 1 }}場</h3>
          <i class="mdi mdi-close close-icon" @click="pending = null"></i>
        </div>
        <p class="file-line">{{ pending.fileName }}<template v-if="pending.playedAt"> · {{ formatDateTime(pending.playedAt) }}</template></p>

        <p class="field-label">哪一邊是我方？</p>
        <div class="side-options">
          <label v-for="(s, idx) in pending.sides" :key="'side_' + idx" :class="['side-option', { active: pending.myIndex === idx }]">
            <input type="radio" :value="idx" v-model="pending.myIndex" />
            <span class="side-option-name">{{ s.name }}</span>
            <span class="side-option-count">{{ s.players.length }} 人</span>
          </label>
        </div>

        <label v-if="pendingOppName && pendingOppName !== opponents[activeIndex]" class="check-line">
          <input type="checkbox" v-model="pending.updateOpponent" />
          同時把第{{ activeIndex + 1 }}場的對陣幫會設為「{{ pendingOppName }}」（目前：{{ opponents[activeIndex] || '未填選' }}）
        </label>

        <p v-if="current" class="warn-text">這一場已經有戰績數據，確認後會被新檔案取代。</p>

        <div class="modal-footer">
          <button class="btn-secondary" @click="pending = null">取消</button>
          <button class="btn-primary" :disabled="isSaving" @click="savePending">{{ isSaving ? '保存中...' : '確認上傳' }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../../utils/supabase'
import { getWriteError } from '../../utils/writeResult'
import { parseMatchCsv, formatStat, STAT_FIELDS } from '../../utils/matchStatsCsv'

const props = defineProps({
  leagueItem: { type: Object, required: true },
  canEdit: { type: Boolean, default: false }
})
const emit = defineEmits(['back'])

// 「各項最高」要列出的欄位
const MVP_FIELDS = ['kills', 'assists', 'pvp', 'bld', 'heal', 'tank', 'feather', 'bone']

const opponents = ref([...(props.leagueItem.opponents || [])])
const activeIndex = ref(0)
const statsRows = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const fileInput = ref(null)
const pending = ref(null)

const tableSide = ref('my')
const jobFilter = ref('')
const searchName = ref('')
const sortKey = ref('pvp')
const sortDesc = ref(true)

const statsByIndex = computed(() => Object.fromEntries(statsRows.value.map(r => [r.match_index, r])))
const current = computed(() => statsByIndex.value[activeIndex.value] || null)

const resultBadgeClass = computed(() => {
  const res = props.leagueItem.results?.[activeIndex.value]
  if (res === '我方贏') return 'badge-win'
  if (res === '對方贏') return 'badge-loss'
  return 'badge-gray'
})

const sumOf = (players, key) => players.reduce((s, p) => s + (Number(p[key]) || 0), 0)

const comparisonRows = computed(() => {
  if (!current.value) return []
  return STAT_FIELDS.map(f => {
    const my = sumOf(current.value.my_players, f.key)
    const opp = sumOf(current.value.opp_players, f.key)
    const myPct = my + opp > 0 ? Math.round((my / (my + opp)) * 100) : 50
    // 重傷越少越好，粗體標示表現較好的一方
    const myLeads = f.lowerIsBetter ? my < opp : my > opp
    const oppLeads = f.lowerIsBetter ? opp < my : opp > my
    return { ...f, my, opp, myPct, myLeads, oppLeads }
  })
})

const countJobs = (players) => {
  const counts = {}
  players.forEach(p => { counts[p.job || '未知'] = (counts[p.job || '未知'] || 0) + 1 })
  return Object.entries(counts).map(([job, count]) => ({ job, count })).sort((a, b) => b.count - a.count)
}

const jobBreakdown = computed(() => current.value
  ? [{ key: 'my', jobs: countJobs(current.value.my_players) }, { key: 'opp', jobs: countJobs(current.value.opp_players) }]
  : [])

const mvpList = computed(() => {
  if (!current.value) return []
  const everyone = [
    ...current.value.my_players.map(p => ({ ...p, side: 'my' })),
    ...current.value.opp_players.map(p => ({ ...p, side: 'opp' }))
  ]
  return MVP_FIELDS.map(key => {
    const top = everyone.reduce((best, p) => (Number(p[key]) || 0) > (Number(best?.[key]) || 0) ? p : best, null)
    const label = STAT_FIELDS.find(f => f.key === key).label
    return top ? { key, label, name: top.name, job: top.job, side: top.side, value: top[key] } : null
  }).filter(Boolean)
})

const sidePlayers = computed(() => current.value ? (tableSide.value === 'my' ? current.value.my_players : current.value.opp_players) : [])
const tableJobs = computed(() => countJobs(sidePlayers.value).map(j => j.job))

const tableRows = computed(() => {
  const keyword = searchName.value.trim()
  const rows = sidePlayers.value.filter(p => (!jobFilter.value || p.job === jobFilter.value) && (!keyword || p.name.includes(keyword)))
  const dir = sortDesc.value ? -1 : 1
  return [...rows].sort((a, b) => ((Number(a[sortKey.value]) || 0) - (Number(b[sortKey.value]) || 0)) * dir)
})

// 換邊或換場時，原本選的職業不一定存在，清掉篩選
watch(tableSide, () => { jobFilter.value = '' })
watch(activeIndex, () => {
  tableSide.value = 'my'
  jobFilter.value = ''
  searchName.value = ''
})

const toggleSort = (key) => {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value
  else { sortKey.value = key; sortDesc.value = true }
}

const formatDateTime = (value) => {
  const d = new Date(value)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

const fetchStats = async () => {
  isLoading.value = true
  const { data, error } = await supabase.from('match_stats').select('*').eq('league_id', props.leagueItem.id)
  if (error) alert('讀取戰績數據失敗：' + error.message)
  statsRows.value = data || []
  isLoading.value = false
}

const pickFile = () => {
  if (fileInput.value) {
    fileInput.value.value = ''
    fileInput.value.click()
  }
}

const onFileChosen = async (e) => {
  const file = e.target.files?.[0]
  if (!file) return
  try {
    const parsed = parseMatchCsv(await file.text(), file.name)
    // 預設以名稱等於本聯賽幫會的一邊為我方，否則用第一個區塊（下載者自己的幫會）
    const ownIndex = parsed.sides.findIndex(s => s.name === props.leagueItem.guild)
    const myIndex = ownIndex >= 0 ? ownIndex : 0
    const currentOpp = opponents.value[activeIndex.value]
    pending.value = { ...parsed, myIndex, updateOpponent: !currentOpp || currentOpp === '未填選' }
  } catch (err) {
    alert('無法讀取這個檔案：' + err.message)
  }
}

const pendingOppName = computed(() => pending.value ? pending.value.sides[1 - pending.value.myIndex].name : '')

const savePending = async () => {
  if (!pending.value || isSaving.value) return
  isSaving.value = true
  const p = pending.value
  const my = p.sides[p.myIndex]
  const opp = p.sides[1 - p.myIndex]
  const idx = activeIndex.value
  const payload = {
    league_id: props.leagueItem.id,
    guild_id: props.leagueItem.guild_id,
    match_index: idx,
    file_name: p.fileName,
    played_at: p.playedAt ? p.playedAt.toISOString() : null,
    my_name: my.name,
    opp_name: opp.name,
    my_players: my.players,
    opp_players: opp.players,
    updated_at: new Date().toISOString()
  }

  const existing = statsByIndex.value[idx]
  const error = getWriteError(existing
    ? await supabase.from('match_stats').update(payload).eq('id', existing.id).select('id')
    : await supabase.from('match_stats').insert([payload]).select('id'))
  if (error) {
    isSaving.value = false
    return alert('保存戰績數據失敗：' + error)
  }

  if (p.updateOpponent && opp.name && opp.name !== opponents.value[idx]) {
    const nextOpponents = [...opponents.value]
    nextOpponents[idx] = opp.name
    const oppError = getWriteError(await supabase.from('guild_rosters').update({ opponents: nextOpponents }).eq('id', props.leagueItem.id).select('id'))
    if (oppError) alert('戰績已保存，但更新對陣幫會失敗：' + oppError)
    else opponents.value = nextOpponents
  }

  pending.value = null
  isSaving.value = false
  tableSide.value = 'my'
  jobFilter.value = ''
  await fetchStats()
}

const deleteStats = async () => {
  if (!current.value) return
  if (!confirm(`確定要刪除第${activeIndex.value + 1}場的戰績數據嗎？`)) return
  const error = getWriteError(await supabase.from('match_stats').delete().eq('id', current.value.id).select('id'))
  if (error) return alert('刪除失敗：' + error)
  await fetchStats()
}

onMounted(fetchStats)
</script>

<style scoped>
.stats-page { display: flex; flex-direction: column; gap: 14px; }
.stats-header { display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 14px; }
.page-title { margin: 0; font-size: 18px; font-weight: bold; color: #1e293b; }
.sub-text { font-size: 12px; color: #64748b; margin-top: 2px; }

.match-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.match-tab { position: relative; background: #ffffff; border: 1px solid #cbd5e1; color: #475569; padding: 7px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.match-tab.active { background: #3b82f6; border-color: #3b82f6; color: #ffffff; font-weight: bold; }
.tab-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; margin-left: 6px; vertical-align: middle; }

.card, .empty-card, .info-bar { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.card { padding: 16px; }
.card-title { margin: 0 0 12px; font-size: 14px; color: #1e293b; }
.empty-card { padding: 40px 20px; text-align: center; color: #475569; font-size: 14px; }
.empty-icon { font-size: 40px; color: #94a3b8; }
.hint { font-size: 12px; color: #64748b; margin: 6px 0 14px; }
.hint code { background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }

.info-bar { padding: 10px 16px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; font-size: 13px; color: #475569; }
.info-actions { margin-left: auto; display: flex; gap: 10px; align-items: center; }

.vs-head { display: flex; justify-content: center; align-items: center; gap: 14px; margin-bottom: 14px; font-weight: bold; }
.side-name.my { color: #2563eb; }
.side-name.opp { color: #dc2626; }
.vs-mark { color: #94a3b8; font-size: 12px; }
.vs-rows { display: flex; flex-direction: column; gap: 8px; max-width: 720px; margin: 0 auto; }
.vs-row { display: grid; grid-template-columns: 80px 1fr 80px; align-items: center; gap: 10px; }
.vs-val { font-size: 13px; color: #94a3b8; }
.vs-val.left { text-align: right; }
.vs-val.lead { color: #1e293b; font-weight: bold; }
.vs-label { text-align: center; font-size: 12px; color: #64748b; margin-bottom: 3px; }
.vs-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: #f1f5f9; }
.bar-my { background: #3b82f6; }
.bar-opp { background: #ef4444; }

.job-compare { margin-top: 16px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; flex-direction: column; gap: 6px; }
.job-line { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; font-size: 12px; }
.job-side { font-weight: bold; width: 64px; }
.job-side.my { color: #2563eb; }
.job-side.opp { color: #dc2626; }
.job-chip { background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 10px; }

.mvp-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 8px; }
.mvp-item { display: grid; grid-template-columns: 76px 1fr auto; grid-template-rows: auto auto; column-gap: 8px; padding: 8px 10px; border: 1px solid #f1f5f9; border-radius: 8px; font-size: 12px; align-items: center; }
.mvp-label { grid-row: span 2; color: #64748b; }
.mvp-name { font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mvp-name.my { color: #2563eb; }
.mvp-name.opp { color: #dc2626; }
.mvp-val { grid-row: span 2; font-weight: bold; color: #1e293b; }
.mvp-job { color: #94a3b8; }

.table-tools { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.pill-group { display: flex; gap: 6px; flex-wrap: wrap; }
.job-filter { margin: 10px 0; }
.pill { background: #f8fafc; border: 1px solid #cbd5e1; color: #475569; padding: 5px 12px; border-radius: 14px; font-size: 12px; cursor: pointer; }
.pill.small { padding: 3px 10px; }
.pill.active { background: #eff6ff; border-color: #3b82f6; color: #2563eb; font-weight: bold; }
.search-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 13px; width: 180px; }

.table-scroll { overflow-x: auto; }
.player-table { width: 100%; border-collapse: collapse; font-size: 12px; white-space: nowrap; }
.player-table th, .player-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; }
.player-table th { background: #f8fafc; color: #64748b; font-weight: 600; position: sticky; top: 0; }
.player-table .col-name, .player-table th:nth-child(3), .player-table td:nth-child(3) { text-align: left; }
.player-table .col-rank { text-align: center; color: #94a3b8; width: 32px; }
.player-table td.col-name { font-weight: bold; color: #1e293b; }
.player-table td.zero { color: #cbd5e1; }
.player-table tfoot td { font-weight: bold; background: #f8fafc; color: #1e293b; }
.sortable { cursor: pointer; user-select: none; }
.sortable.sorted { color: #2563eb; }
.empty-cell { text-align: center !important; color: #94a3b8; padding: 24px; }

.hidden-input { display: none; }
.btn-back { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #475569; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 7px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; cursor: pointer; font-size: 13px; padding: 0; }
.text-red { color: #ef4444; }
.result-badge { padding: 3px 12px; border-radius: 14px; font-size: 11px; font-weight: bold; }
.badge-win { background: #3b82f6; color: #ffffff; }
.badge-loss { background: #ef4444; color: #ffffff; }
.badge-gray { background: #e2e8f0; color: #64748b; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 16px; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; width: 460px; max-width: 100%; max-height: 85vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 16px; }
.close-icon { cursor: pointer; font-size: 20px; color: #94a3b8; }
.file-line { font-size: 12px; color: #64748b; word-break: break-all; }
.field-label { font-size: 13px; font-weight: bold; margin: 14px 0 8px; }
.side-options { display: flex; flex-direction: column; gap: 8px; }
.side-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 13px; }
.side-option.active { border-color: #3b82f6; background: #eff6ff; }
.side-option-name { font-weight: bold; flex: 1; }
.side-option-count { color: #64748b; }
.check-line { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; margin-top: 14px; color: #334155; }
.warn-text { font-size: 12px; color: #b45309; background: #fffbeb; padding: 8px 10px; border-radius: 6px; margin-top: 14px; }
.modal-footer { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; }

@media (max-width: 640px) {
  .header-left { flex-direction: column; align-items: flex-start; gap: 8px; }
  .vs-row { grid-template-columns: 64px 1fr 64px; }
  .info-actions { margin-left: 0; }
  .search-input { width: 100%; }
}
</style>
