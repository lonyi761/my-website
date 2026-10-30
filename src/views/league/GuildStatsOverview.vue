<template>
  <div class="overview-page">
    <div class="overview-header">
      <div class="header-left">
        <button class="btn-back" @click="emit('back')">&lt; 返回聯賽列表</button>
        <h2 class="page-title">戰績總覽</h2>
      </div>
    </div>

    <!-- 篩選 -->
    <div class="card filter-bar">
      <select v-model="guildId" class="filter-select">
        <option v-for="g in guilds" :key="g.id" :value="g.id">{{ g.name }}</option>
      </select>
      <select v-model="range" class="filter-select">
        <option value="all">全部期間</option>
        <option value="30">近 30 天</option>
        <option value="90">近 90 天</option>
      </select>
      <select v-model="typeFilter" class="filter-select">
        <option value="">全部類型</option>
        <option value="幫會聯賽">幫會聯賽</option>
        <option value="俱樂部比賽">俱樂部比賽</option>
        <option value="寒烽決影">寒烽決影</option>
      </select>
      <div class="pill-group">
        <button :class="['pill', { active: mode === 'avg' }]" @click="mode = 'avg'">每場平均</button>
        <button :class="['pill', { active: mode === 'total' }]" @click="mode = 'total'">總和</button>
      </div>
      <label class="min-games">至少 <input v-model.number="minGames" type="number" min="0" /> 場</label>
      <label class="min-games"><input v-model="showUnlinked" type="checkbox" class="check" /> 顯示未對應的玩家</label>
      <input v-model="searchName" class="search-input" placeholder="搜尋成員" />
    </div>

    <div v-if="isLoading" class="empty-card">讀取中...</div>
    <div v-else-if="!filteredRows.length" class="empty-card">
      <i class="mdi mdi-chart-box-outline empty-icon"></i>
      <p>{{ rows.length ? '這個期間／類型沒有戰績數據。' : '這個幫會還沒有上傳任何戰績。到聯賽列表按「數據」上傳後，這裡就會開始累積。' }}</p>
    </div>

    <template v-else>
      <div class="summary-row">
        <span class="sum-chip">場次 <b>{{ filteredRows.length }}</b></span>
        <span class="sum-chip">上場成員 <b>{{ memberPlayerCount }}</b></span>
        <span class="sum-chip">勝負 <b>{{ teamRecord.wins }} 勝 {{ teamRecord.losses }} 敗</b><template v-if="teamRecord.pending">（{{ teamRecord.pending }} 場未填結果）</template></span>
        <span v-if="unlinkedCount" class="sum-chip warn">未對應成員的玩家 {{ unlinkedCount }} 位（到各場「數據」頁指定）</span>
      </div>

      <div class="card">
        <div class="pill-group job-filter">
          <button :class="['pill', 'small', { active: !jobFilter }]" @click="jobFilter = ''">全部職業</button>
          <button v-for="j in allJobs" :key="j" :class="['pill', 'small', { active: jobFilter === j }]" @click="jobFilter = jobFilter === j ? '' : j">{{ j }}</button>
        </div>

        <div class="table-scroll">
          <table class="rank-table">
            <thead>
              <tr>
                <th class="col-rank">#</th>
                <th class="col-name">成員</th>
                <th class="col-left">主職業</th>
                <th :class="sortClass('count')" @click="toggleSort('count')">場數{{ sortArrow('count') }}</th>
                <th :class="sortClass('winRate')" @click="toggleSort('winRate')">勝率{{ sortArrow('winRate') }}</th>
                <th :class="sortClass('missedCount')" @click="toggleSort('missedCount')" title="有排表的場次中：排了沒上場次數／被排進席位次數">排了沒上{{ sortArrow('missedCount') }}</th>
                <th v-for="f in STAT_FIELDS" :key="f.key" :class="sortClass(f.key)" @click="toggleSort(f.key)">{{ f.label }}{{ sortArrow(f.key) }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(p, i) in tableRows" :key="p.key" class="clickable-row" @click="detail = p">
                <td class="col-rank">{{ i + 1 }}</td>
                <td class="col-name">
                  {{ p.name }}
                  <span v-if="p.unlinked" class="name-tag warn">未對應</span>
                  <span v-else-if="p.guildId && p.guildId !== guildId" class="name-tag">{{ guildName(p.guildId) }}</span>
                </td>
                <td class="col-left">{{ p.mainJob || '—' }}</td>
                <td>{{ p.count }}</td>
                <td>{{ p.winRate === null ? '—' : Math.round(p.winRate * 100) + '%' }}</td>
                <td :class="{ warn: p.missedCount }">{{ p.seatedCount ? p.missedCount + ' / ' + p.seatedCount : '—' }}</td>
                <td v-for="f in STAT_FIELDS" :key="f.key" :class="{ zero: !statValue(p, f.key) }">{{ p.count ? formatValue(statValue(p, f.key)) : '—' }}</td>
              </tr>
              <tr v-if="tableRows.length === 0">
                <td :colspan="6 + STAT_FIELDS.length" class="empty-cell">沒有符合條件的成員</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p class="hint">點成員可看每一場的紀錄。勝率只計算已填結果的場次；「排了沒上」只計算有排表的場次。外援不列入。</p>
      </div>
    </template>

    <!-- 個人紀錄 -->
    <div v-if="detail" class="modal-overlay" @click.self="detail = null">
      <div class="modal-card">
        <div class="modal-header">
          <h3>{{ detail.name }}<span v-if="detail.unlinked" class="name-tag warn">未對應</span></h3>
          <i class="mdi mdi-close close-icon" @click="detail = null"></i>
        </div>
        <div class="summary-row">
          <span class="sum-chip">出賽 <b>{{ detail.count }}</b> 場</span>
          <span class="sum-chip">勝率 <b>{{ detail.winRate === null ? '—' : Math.round(detail.winRate * 100) + '%' }}</b></span>
          <span v-if="detail.seatedCount" :class="['sum-chip', { warn: detail.missedCount }]">排了沒上 <b>{{ detail.missedCount }}</b> / {{ detail.seatedCount }}</span>
          <span v-if="detail.jobs.length" class="sum-chip">職業 {{ detail.jobs.join('、') }}</span>
        </div>

        <div v-if="detail.games.length" class="table-scroll">
          <table class="rank-table">
            <thead>
              <tr>
                <th class="col-left">日期</th>
                <th class="col-left">聯賽</th>
                <th class="col-left">對手</th>
                <th class="col-left">結果</th>
                <th class="col-left">職業</th>
                <th v-for="f in STAT_FIELDS" :key="f.key">{{ f.label }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="g in detail.games" :key="g.id">
                <td class="col-left">{{ formatDate(g.date) }}</td>
                <td class="col-left">{{ g.title }}<small> 第{{ g.matchIndex + 1 }}場</small></td>
                <td class="col-left">{{ g.oppName }}</td>
                <td class="col-left"><span :class="['result-badge', resultClass(g.result)]">{{ g.result }}</span></td>
                <td class="col-left">{{ g.job }}<small v-if="g.csvName !== detail.name">（{{ g.csvName }}）</small></td>
                <td v-for="f in STAT_FIELDS" :key="f.key" :class="{ zero: !g.stats[f.key] }">{{ g.stats[f.key] ? formatStat(g.stats[f.key]) : '—' }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td class="col-left" colspan="5">每場平均</td>
                <td v-for="f in STAT_FIELDS" :key="f.key">{{ formatValue(detail.averages[f.key]) }}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div v-if="detail.missed.length" class="missed-box">
          <div class="missed-title">排了沒上場</div>
          <div v-for="m in detail.missed" :key="'m_' + m.id" class="missed-line">
            {{ formatDate(m.date) }} · {{ m.title }} 第{{ m.matchIndex + 1 }}場 · 對 {{ m.oppName }}<small v-if="m.place">（{{ m.place }}）</small>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '../../utils/supabase'
import { formatStat, STAT_FIELDS } from '../../utils/matchStatsCsv'
import { aggregateMemberStats } from '../../utils/matchAggregate'

const props = defineProps({
  guilds: { type: Array, required: true },
  defaultGuildId: { type: String, default: '' }
})
const emit = defineEmits(['back'])

const guildId = ref(props.defaultGuildId || props.guilds[0]?.id || '')
const range = ref('all')
const typeFilter = ref('')
const mode = ref('avg')
const minGames = ref(1)
const showUnlinked = ref(true)
const searchName = ref('')
const jobFilter = ref('')
const sortKey = ref('pvp')
const sortDesc = ref(true)
const detail = ref(null)

const isLoading = ref(false)
const rows = ref([])
const leaguesById = ref(new Map())
const members = ref([])

const guildName = (id) => props.guilds.find(g => g.id === id)?.name || '其他幫會'

const load = async () => {
  if (!guildId.value) return
  isLoading.value = true
  detail.value = null
  const { data: statRows, error } = await supabase
    .from('match_stats')
    .select('id, league_id, match_index, played_at, opp_name, my_players, member_links, updated_at')
    .eq('guild_id', guildId.value)
  if (error) alert('讀取戰績失敗：' + error.message)
  const list = statRows || []

  // 只讀有戰績的聯賽；排表（matrix_teams）用來算排了沒上
  const leagueIds = [...new Set(list.map(r => r.league_id))]
  const [leagueRes, memberRes] = await Promise.all([
    leagueIds.length
      ? supabase.from('guild_rosters').select('id, title, type, start_time, results, matrix_teams').in('id', leagueIds)
      : Promise.resolve({ data: [] }),
    supabase.from('guild_members').select('id, name, former_names, guild_id, current_school, schools')
  ])
  leaguesById.value = new Map((leagueRes.data || []).map(l => [l.id, l]))
  members.value = memberRes.data || []
  rows.value = list
  isLoading.value = false
}

const matchDate = (row) => row.played_at || leaguesById.value.get(row.league_id)?.start_time || null

const filteredRows = computed(() => {
  const since = range.value === 'all' ? null : Date.now() - Number(range.value) * 86400000
  return rows.value.filter(r => {
    const league = leaguesById.value.get(r.league_id)
    if (typeFilter.value && league?.type !== typeFilter.value) return false
    if (since) {
      const t = new Date(matchDate(r)).getTime()
      if (isNaN(t) || t < since) return false
    }
    return true
  })
})

const aggregate = computed(() => aggregateMemberStats({
  rows: filteredRows.value,
  linkRows: rows.value,
  leaguesById: leaguesById.value,
  members: members.value,
  guildId: guildId.value
}))

const memberPlayerCount = computed(() => aggregate.value.players.filter(p => !p.unlinked && p.count > 0).length)
const unlinkedCount = computed(() => aggregate.value.players.filter(p => p.unlinked).length)
const teamRecord = computed(() => {
  const res = aggregate.value.matches.map(m => m.result)
  return { wins: res.filter(r => r === '我方贏').length, losses: res.filter(r => r === '對方贏').length, pending: res.filter(r => r !== '我方贏' && r !== '對方贏').length }
})
const allJobs = computed(() => [...new Set(aggregate.value.players.map(p => p.mainJob).filter(Boolean))])

const statValue = (p, key) => (mode.value === 'avg' ? p.averages[key] : p.totals[key])
// 平均值保留小數的只有次數類欄位（數值小）；傷害、治療等大數照常縮寫
const formatValue = (v) => {
  const n = Number(v) || 0
  if (Math.abs(n) < 1000 && !Number.isInteger(n)) return n.toFixed(1)
  return formatStat(Math.round(n))
}

const sortValue = (p, key) => {
  if (key === 'count' || key === 'missedCount') return p[key]
  if (key === 'winRate') return p.winRate === null ? -1 : p.winRate
  return statValue(p, key)
}

const tableRows = computed(() => {
  const keyword = searchName.value.trim()
  const dir = sortDesc.value ? -1 : 1
  return aggregate.value.players
    // 排了沒上場的成員即使 0 場也列出，出勤問題才看得到
    .filter(p => p.count >= (Number(minGames.value) || 0) || p.missedCount > 0)
    .filter(p => showUnlinked.value || !p.unlinked)
    .filter(p => !jobFilter.value || p.mainJob === jobFilter.value)
    .filter(p => !keyword || p.name.includes(keyword))
    .sort((a, b) => (sortValue(a, sortKey.value) - sortValue(b, sortKey.value)) * dir || b.count - a.count)
})

const toggleSort = (key) => {
  if (sortKey.value === key) sortDesc.value = !sortDesc.value
  else { sortKey.value = key; sortDesc.value = true }
}
const sortClass = (key) => ['sortable', { sorted: sortKey.value === key }]
const sortArrow = (key) => (sortKey.value === key ? (sortDesc.value ? ' ▼' : ' ▲') : '')

const resultClass = (res) => (res === '我方贏' ? 'badge-win' : res === '對方贏' ? 'badge-loss' : 'badge-gray')
const formatDate = (value) => {
  const d = new Date(value)
  if (!value || isNaN(d)) return '—'
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

watch(guildId, () => {
  jobFilter.value = ''
  load()
})
onMounted(load)
</script>

<style scoped>
.overview-page { display: flex; flex-direction: column; gap: 14px; }
.header-left { display: flex; align-items: center; gap: 14px; }
.page-title { margin: 0; font-size: 18px; font-weight: bold; color: #1e293b; }

.card, .empty-card { background: #ffffff; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.card { padding: 16px; }
.empty-card { padding: 40px 20px; text-align: center; color: #475569; font-size: 14px; }
.empty-icon { font-size: 40px; color: #94a3b8; }

.filter-bar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; padding: 12px 16px; }
.filter-select { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 13px; background: #ffffff; }
.min-games { font-size: 13px; color: #475569; display: inline-flex; align-items: center; gap: 4px; }
.min-games input.check { width: auto; }
.min-games input { width: 52px; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 6px; font-size: 13px; }
.search-input { border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; font-size: 13px; width: 160px; margin-left: auto; }

.summary-row { display: flex; flex-wrap: wrap; gap: 8px; }
.sum-chip { background: #ffffff; border: 1px solid #e2e8f0; color: #475569; padding: 5px 12px; border-radius: 14px; font-size: 12px; }
.sum-chip b { color: #1e293b; }
.sum-chip.warn { background: #fffbeb; border-color: #fde68a; color: #b45309; }

.pill-group { display: flex; gap: 6px; flex-wrap: wrap; }
.job-filter { margin-bottom: 10px; }
.pill { background: #f8fafc; border: 1px solid #cbd5e1; color: #475569; padding: 5px 12px; border-radius: 14px; font-size: 12px; cursor: pointer; }
.pill.small { padding: 3px 10px; }
.pill.active { background: #eff6ff; border-color: #3b82f6; color: #2563eb; font-weight: bold; }

.table-scroll { overflow-x: auto; }
.rank-table { width: 100%; border-collapse: collapse; font-size: 12px; white-space: nowrap; }
.rank-table th, .rank-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: right; }
.rank-table th { background: #f8fafc; color: #64748b; font-weight: 600; }
.rank-table .col-left, .rank-table .col-name { text-align: left; }
.rank-table .col-rank { text-align: center; color: #94a3b8; width: 32px; }
.rank-table td.col-name { font-weight: bold; color: #1e293b; }
.rank-table td.zero { color: #cbd5e1; }
.rank-table td.warn { color: #b45309; font-weight: bold; }
.rank-table td small { color: #94a3b8; }
.rank-table tfoot td { font-weight: bold; background: #f8fafc; color: #1e293b; }
.clickable-row { cursor: pointer; }
.clickable-row:hover td { background: #f8fafc; }
.sortable { cursor: pointer; user-select: none; }
.sortable.sorted { color: #2563eb; }
.empty-cell { text-align: center !important; color: #94a3b8; padding: 24px; }
.hint { font-size: 12px; color: #64748b; margin: 10px 0 0; }
.name-tag { margin-left: 6px; font-size: 10px; font-weight: normal; color: #64748b; background: #f1f5f9; padding: 1px 6px; border-radius: 8px; }
.name-tag.warn { color: #b45309; background: #fef3c7; }

.result-badge { padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.badge-win { background: #3b82f6; color: #ffffff; }
.badge-loss { background: #ef4444; color: #ffffff; }
.badge-gray { background: #e2e8f0; color: #64748b; }

.btn-back { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #475569; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 16px; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; width: 1000px; max-width: 100%; max-height: 85vh; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 16px; }
.close-icon { cursor: pointer; font-size: 20px; color: #94a3b8; }
.missed-box { background: #fffbeb; border-radius: 8px; padding: 10px 12px; font-size: 12px; color: #78350f; }
.missed-title { font-weight: bold; color: #b45309; margin-bottom: 4px; }
.missed-line small { color: #a16207; }

@media (max-width: 640px) {
  .search-input { width: 100%; margin-left: 0; }
}
</style>
