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
      <div ref="exportArea" class="export-area">
        <!-- 計分板 -->
        <div class="scoreboard">
          <div class="sb-side my">
            <div class="sb-name">{{ current.my_name }}</div>
            <div class="sb-meta">{{ current.my_players.length }} 人<span :class="['sb-result', sideResult('my').cls]">{{ sideResult('my').text }}</span></div>
          </div>
          <div class="sb-center">
            <div class="sb-vs">VS</div>
            <div class="sb-time">{{ current.played_at ? formatDateTime(current.played_at) : leagueItem.startTime }}</div>
            <div class="sb-league">{{ leagueItem.title }} · 第{{ activeIndex + 1 }}場</div>
          </div>
          <div class="sb-side opp">
            <div class="sb-name">{{ current.opp_name }}</div>
            <div class="sb-meta"><span :class="['sb-result', sideResult('opp').cls]">{{ sideResult('opp').text }}</span>{{ current.opp_players.length }} 人</div>
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
            <button v-for="v in VIEWS" :key="v.key" :class="['view-tab', { active: view === v.key }]" @click="view = v.key">
              <i :class="['mdi', v.icon]"></i>{{ v.label }}
              <span v-if="v.key === 'attendance' && attendanceAlerts" class="view-badge">{{ attendanceAlerts }}</span>
            </button>
          </div>
          <div class="view-actions">
            <button class="btn-tool" :disabled="isExporting" title="把目前畫面存成圖片（亮色）" @click="exportImage"><i class="mdi mdi-image-outline"></i> {{ isExporting ? '產生中...' : '導出圖片' }}</button>
            <template v-if="canEdit">
              <button class="btn-tool" @click="pickFile"><i class="mdi mdi-upload"></i> 重新上傳</button>
              <button class="btn-tool danger" @click="deleteStats"><i class="mdi mdi-delete-outline"></i> 刪除數據</button>
            </template>
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
              <TitlePanel :my="current.my_players" :opp="current.opp_players" />
            </div>
          </div>
          <div class="card">
            <JobCompare :my="current.my_players" :opp="current.opp_players" />
          </div>
        </template>

        <!-- 我方／對方明細 -->
        <div v-else-if="view === 'my' || view === 'opp'" class="card">
          <PlayerStatsTable
            :key="view + '_' + activeIndex"
            :players="view === 'my' ? current.my_players : current.opp_players"
            :side="view"
            :side-name="view === 'my' ? current.my_name : current.opp_name"
            :team-of="view === 'my' ? teamOfPlayer : null"
            :tag-of="view === 'my' ? memberTagOf : null"
            :file-label="leagueItem.title + '_第' + (activeIndex + 1) + '場'"
          />
        </div>

        <!-- 出勤對照 -->
        <template v-else>
          <!-- 出勤對照（只看我方） -->
          <div class="card">
            <h3 class="card-title">出勤對照（{{ current.my_name }}）</h3>
            <p v-if="!attendance.hasRoster" class="hint left">這場聯賽還沒有排表，只能比對成員；排好表後就會顯示誰沒上場、誰沒排卻上場。</p>

            <div class="att-summary">
              <span v-if="attendance.hasRoster" class="att-chip">排表上場 {{ attendance.seatedPlayed.length + attendance.seatedMissing.length }} 人，有出賽 {{ attendance.seatedPlayed.length }} 人</span>
              <span v-if="attendance.hasRoster" :class="['att-chip', { warn: attendance.seatedMissing.length }]">排了沒上場 {{ attendance.seatedMissing.length }}</span>
              <span v-if="attendance.hasRoster" class="att-chip">候補上場 {{ attendance.subsPlayed.length }}</span>
              <span :class="['att-chip', { warn: attendance.hasRoster && attendance.unplanned.length }]">{{ attendance.hasRoster ? '沒排卻上場' : '已對應成員' }} {{ attendance.hasRoster ? attendance.unplanned.length : linkedCount }}</span>
              <span v-if="attendance.hasRoster" :class="['att-chip', { warn: attendance.absentPlayed.length }]">登記不出席卻上場 {{ attendance.absentPlayed.length }}</span>
              <span v-if="attendance.hasRoster" class="att-chip">不出席（確實沒上） {{ attendance.absentConfirmed }}</span>
              <span :class="['att-chip', { warn: attendance.unlinked.length }]">未對應成員 {{ attendance.unlinked.length }}</span>
            </div>

            <div class="att-groups">
              <div v-if="attendance.seatedMissing.length" class="att-group">
                <div class="att-group-title warn">排了沒上場</div>
                <span v-for="p in attendance.seatedMissing" :key="'miss_' + p.memberId" class="att-name">{{ p.name }}<small v-if="p.place">{{ p.place }}</small></span>
              </div>
              <div v-if="attendance.absentPlayed.length" class="att-group">
                <div class="att-group-title warn">登記不出席卻上場</div>
                <span v-for="p in attendance.absentPlayed" :key="'abs_' + p.memberId" class="att-name">{{ p.name }}<small v-if="p.csvName !== p.name">遊戲內：{{ p.csvName }}</small></span>
              </div>
              <div v-if="attendance.hasRoster && attendance.unplanned.length" class="att-group">
                <div class="att-group-title warn">沒排卻上場</div>
                <span v-for="p in attendance.unplanned" :key="'unp_' + p.memberId" class="att-name">
                  {{ p.name }}<small v-if="p.otherGuild">{{ guildName(p.otherGuild) }}</small><small v-if="p.csvName !== p.name">遊戲內：{{ p.csvName }}</small>
                </span>
              </div>
              <div v-if="attendance.subsPlayed.length" class="att-group">
                <div class="att-group-title">候補上場</div>
                <span v-for="p in attendance.subsPlayed" :key="'sub_' + p.memberId" class="att-name">{{ p.name }}</span>
              </div>
            </div>

            <!-- 對應不到成員的玩家 -->
            <div v-if="attendance.unlinked.length || manualLinkRows.length || pastLinkRows.length" class="link-box">
              <div class="link-head">
                <div class="att-group-title">成員對應</div>
                <label v-if="canEdit" class="link-mode">
                  指定成員後：
                  <select v-model="linkMode" class="link-mode-select">
                    <option value="rename">改用遊戲名稱（原名改為曾用名）</option>
                    <option value="former">加入曾用名（保留原名）</option>
                    <option value="none">只對應這一場</option>
                  </select>
                </label>
              </div>
              <p v-if="attendance.unlinked.length && !canEdit" class="hint left">以下玩家對應不到成員，需要編輯權限才能手動指定。</p>

              <div v-for="p in attendance.unlinked" :key="'ul_' + p.name" class="link-row">
                <span class="link-csv">{{ p.name }} <small>{{ p.job }}</small></span>
                <span class="link-reason">{{ p.how === 'ambiguous' ? '有多位同名成員' : '找不到成員' }}</span>
                <select v-if="canEdit" class="link-select" :disabled="isLinking" @change="onLinkChoice(p, $event)">
                  <option value="">選擇成員…</option>
                  <option :value="NOT_MEMBER">非幫會成員（外援）</option>
                  <option v-if="p.how !== 'ambiguous'" :value="NEW_MEMBER">＋ 新增為{{ guildName(leagueItem.guild_id) }}成員</option>
                  <optgroup v-for="group in linkOptions(p)" :key="group.label" :label="group.label">
                    <option v-for="m in group.members" :key="m.id" :value="m.id">{{ m.label }}</option>
                  </optgroup>
                </select>
              </div>

              <!-- 沿用其他場次的手動指定；這一場要改可直接另選，只影響這一場 -->
              <div v-for="p in pastLinkRows" :key="'pl_' + p.name" class="link-row done">
                <span class="link-csv">{{ p.name }} <small>{{ p.job }}</small></span>
                <span class="link-reason">{{ p.label }}</span>
                <select v-if="canEdit" class="link-select" :disabled="isLinking" @change="onLinkChoice(p, $event)">
                  <option value="">這一場改為…</option>
                  <option v-if="p.how !== 'pastNotMember'" :value="NOT_MEMBER">非幫會成員（外援）</option>
                  <option :value="NEW_MEMBER">＋ 新增為{{ guildName(leagueItem.guild_id) }}成員</option>
                  <optgroup v-for="group in linkOptions(p)" :key="group.label" :label="group.label">
                    <option v-for="m in group.members" :key="m.id" :value="m.id">{{ m.label }}</option>
                  </optgroup>
                </select>
              </div>

              <div v-for="row in manualLinkRows" :key="'ml_' + row.csvName" class="link-row done">
                <span class="link-csv">{{ row.csvName }}</span>
                <span class="link-reason">{{ row.label }}</span>
                <button v-if="canEdit" class="btn-link" :disabled="isLinking" @click="setLink(row.csvName, '')">取消對應</button>
              </div>
            </div>
          </div>

        </template>
      </div>
    </template>

    <input ref="fileInput" type="file" accept=".csv" class="hidden-input" @change="onFileChosen" />

    <!-- 指定的成員主、副流派都和這場職業不同時，詢問要不要更新 -->
    <div v-if="jobPrompt" class="modal-overlay" @click.self="resolveJobPrompt(null)">
      <div class="modal-card">
        <div class="modal-header">
          <h3>流派不同</h3>
          <i class="mdi mdi-close close-icon" @click="resolveJobPrompt(null)"></i>
        </div>
        <p class="job-prompt-text">
          「{{ jobPrompt.csvName }}」這場用的是 <b>{{ jobPrompt.job }}</b>，但成員「{{ jobPrompt.member.name }}」目前是
          主流派 <b>{{ jobPrompt.main || '—' }}</b>、副流派 <b>{{ jobPrompt.sub || '—' }}</b>。要更新成員資料嗎？
        </p>
        <div class="job-prompt-actions">
          <button class="btn-primary" :disabled="isLinking" @click="resolveJobPrompt('main')">主流派改為 {{ jobPrompt.job }}</button>
          <button class="btn-primary" :disabled="isLinking" @click="resolveJobPrompt('sub')">{{ jobPrompt.sub ? '副流派改為 ' + jobPrompt.job : '新增副流派 ' + jobPrompt.job }}</button>
          <button class="btn-secondary" :disabled="isLinking" @click="resolveJobPrompt('keep')">不用改，直接對應</button>
          <button class="btn-link" :disabled="isLinking" @click="resolveJobPrompt(null)">取消</button>
        </div>
      </div>
    </div>

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
import { linkPlayers, readRosterPlacement, buildAttendance, collectPastLinks, isNotMemberLink, NOT_MEMBER } from '../../utils/matchAttendance'
import { SCHOOL_NAMES } from '../../constants/schools'
import { notify } from '../../utils/notify'
import PlayerStatsTable from './stats/PlayerStatsTable.vue'
import TitlePanel from './stats/TitlePanel.vue'
import JobCompare from './stats/JobCompare.vue'

const props = defineProps({
  leagueItem: { type: Object, required: true },
  canEdit: { type: Boolean, default: false }
})
const emit = defineEmits(['back'])

const opponents = ref([...(props.leagueItem.opponents || [])])
const activeIndex = ref(0)
const statsRows = ref([])
const isLoading = ref(true)
const isSaving = ref(false)
const fileInput = ref(null)
const pending = ref(null)

// 報告檢視：雙方對比、我方明細、對方明細、出勤對照
const VIEWS = [
  { key: 'compare', label: '雙方對比', icon: 'mdi-scale-balance' },
  { key: 'my', label: '我方明細', icon: 'mdi-shield-account' },
  { key: 'opp', label: '對方明細', icon: 'mdi-sword' },
  { key: 'attendance', label: '出勤對照', icon: 'mdi-clipboard-check-outline' }
]
const view = ref('compare')
const exportArea = ref(null)
const isExporting = ref(false)

// 成員對應與出勤
const members = ref([])
const guilds = ref([])
const rosterTeams = ref([])
const guildLinkRows = ref([])
// 指定成員後怎麼處理名稱：上傳的戰績通常是最新的，預設把成員改成遊戲名稱
const linkMode = ref('rename')
const jobPrompt = ref(null)
const NEW_MEMBER = '__new__'
const isLinking = ref(false)

const statsByIndex = computed(() => Object.fromEntries(statsRows.value.map(r => [r.match_index, r])))
const current = computed(() => statsByIndex.value[activeIndex.value] || null)

// 依聯賽結果顯示每一方的勝負
const sideResult = (side) => {
  const res = props.leagueItem.results?.[activeIndex.value]
  if (res !== '我方贏' && res !== '對方贏') return { text: '未填結果', cls: 'pending' }
  const myWin = res === '我方贏'
  return (side === 'my') === myWin ? { text: '勝利', cls: 'win' } : { text: '敗北', cls: 'loss' }
}

const memberById = computed(() => new Map(members.value.map(m => [m.id, m])))
const guildName = (id) => guilds.value.find(g => g.id === id)?.name || '其他幫會'

const linkedPlayers = computed(() => current.value
  ? linkPlayers(current.value.my_players, members.value, props.leagueItem.guild_id, current.value.member_links || {}, collectPastLinks(guildLinkRows.value, current.value.id))
  : [])
const linkByName = computed(() => Object.fromEntries(linkedPlayers.value.map(p => [p.name, p])))
const linkedCount = computed(() => linkedPlayers.value.filter(p => p.memberId).length)
const attendance = computed(() => buildAttendance(linkedPlayers.value, rosterPlacement.value, memberById.value, props.leagueItem.guild_id))

const manualLinkRows = computed(() => Object.entries(current.value?.member_links || {}).map(([csvName, id]) => ({
  csvName,
  label: id === NOT_MEMBER ? '已標記為外援' : `已指定為 ${memberLabel(id)}`
})))

// 他幫成員附上幫會名，同名時才分得出是哪一位
function memberLabel (id) {
  const m = memberById.value.get(id)
  if (!m) return '（已刪除的成員）'
  return m.guild_id === props.leagueItem.guild_id ? m.name : `${m.name}・${guildName(m.guild_id)}`
}

const pastLinkRows = computed(() => linkedPlayers.value
  .filter(p => p.how === 'past' || p.how === 'pastNotMember')
  .map(p => ({ ...p, label: p.how === 'past' ? `沿用先前指定：${memberLabel(p.memberId)}` : '沿用先前標記：外援' })))

// 手動指定的選單：同名候選、本幫同職業、本幫其他、其他幫會；已對應的成員不再列出
const linkOptions = (player) => {
  const ownGuild = props.leagueItem.guild_id
  const taken = new Set(linkedPlayers.value.filter(p => p.memberId).map(p => p.memberId))
  const withLabel = (m) => ({
    ...m,
    label: m.guild_id === ownGuild ? `${m.name}${m.current_school ? '（' + m.current_school + '）' : ''}` : `${m.name}・${guildName(m.guild_id)}`
  })
  const free = members.value.filter(m => !taken.has(m.id)).sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant'))
  const own = free.filter(m => m.guild_id === ownGuild)
  const sameJob = own.filter(m => m.current_school === player.job || (m.schools || []).includes(player.job))
  return [
    { label: '可能是', members: (player.candidates || []).map(id => memberById.value.get(id)).filter(Boolean) },
    { label: `本幫・${player.job}`, members: sameJob },
    { label: '本幫其他成員', members: own.filter(m => !sameJob.includes(m)) },
    { label: '其他幫會', members: free.filter(m => m.guild_id !== ownGuild) }
  ].filter(g => g.members.length).map(g => ({ ...g, members: g.members.map(withLabel) }))
}

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

// 計分板只顯示幾項重點
const headlineRows = computed(() => comparisonRows.value.filter(r => ['kills', 'pvp', 'bld', 'heal'].includes(r.key)))

// 出勤分頁的提醒數：排了沒上、登記不出席卻上場、沒排卻上場、未對應
const attendanceAlerts = computed(() => {
  const a = attendance.value
  return a.seatedMissing.length + a.absentPlayed.length + (a.hasRoster ? a.unplanned.length : 0) + a.unlinked.length
})

// 我方玩家 → 排表團隊（候補、未排表另外標示）
const rosterPlacement = computed(() => readRosterPlacement(rosterTeams.value))
const teamOfPlayer = (name) => {
  const id = linkByName.value[name]?.memberId
  if (!id) return ''
  const seat = rosterPlacement.value.seated.get(id)
  if (seat) return seat.team || '已排表'
  if (rosterPlacement.value.substitutes.has(id)) return '候補'
  return ''
}

// 我方玩家名稱旁的對應標籤
const memberTagOf = (name) => {
  const link = linkByName.value[name]
  if (isNotMemberLink(link?.how)) return { text: '外援' }
  if (!link?.memberId) return { text: '未對應', warn: true }
  const memberName = memberById.value.get(link.memberId)?.name
  return memberName && memberName !== name ? { text: '成員：' + memberName } : null
}

watch(activeIndex, () => { view.value = 'compare' })

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
    const viewLabel = VIEWS.find(v => v.key === view.value)?.label || ''
    a.download = `${props.leagueItem.title}_第${activeIndex.value + 1}場_${viewLabel}.png`
    a.click()
  } catch (err) {
    notify('導出圖片失敗：' + err.message)
  } finally {
    isExporting.value = false
  }
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
  if (error) notify('讀取戰績數據失敗：' + error.message)
  statsRows.value = data || []
  isLoading.value = false
}

// 成員（所有看得到的幫會，供跨幫對應）與本聯賽排表
const fetchContext = async () => {
  const [membersRes, guildsRes, rosterRes] = await Promise.all([
    supabase.from('guild_members').select('id, name, former_names, guild_id, current_school, schools'),
    supabase.from('guilds').select('id, name'),
    supabase.from('guild_rosters').select('matrix_teams').eq('id', props.leagueItem.id).maybeSingle()
  ])
  if (membersRes.error) notify('讀取成員失敗：' + membersRes.error.message)
  members.value = membersRes.data || []
  guilds.value = guildsRes.data || []
  rosterTeams.value = rosterRes.data?.matrix_teams || []
  await fetchGuildLinks()
}

// 同幫會所有場次的手動指定（含本聯賽其他場），用來沿用先前的選擇
const fetchGuildLinks = async () => {
  const { data } = await supabase.from('match_stats').select('id, member_links, updated_at').eq('guild_id', props.leagueItem.guild_id)
  guildLinkRows.value = data || []
}

// value：成員 id、NOT_MEMBER，或空字串（取消手動對應）
const setLink = async (csvName, value) => {
  const row = current.value
  if (!row || isLinking.value) return
  isLinking.value = true
  const links = { ...(row.member_links || {}) }
  if (value) links[csvName] = value
  else delete links[csvName]

  const updatedAt = new Date().toISOString()
  const error = getWriteError(await supabase.from('match_stats').update({ member_links: links, updated_at: updatedAt }).eq('id', row.id).select('id'))
  if (error) {
    isLinking.value = false
    return notify('保存對應失敗：' + error)
  }
  row.member_links = links
  row.updated_at = updatedAt

  const member = value && value !== NOT_MEMBER ? memberById.value.get(value) : null
  if (member && member.name !== csvName) await applyNameMode(member, csvName)
  await fetchGuildLinks()
  isLinking.value = false
}

// rename：成員改用遊戲名稱、原名進曾用名；former：遊戲名稱進曾用名；none：不改成員資料
const applyNameMode = async (member, csvName) => {
  let mode = linkMode.value
  if (mode === 'none') return
  // 同一幫會已有人叫這個名字時不改名，避免出現兩位同名成員
  if (mode === 'rename' && members.value.some(m => m.id !== member.id && m.guild_id === member.guild_id && m.name === csvName)) {
    notify(`幫會內已有成員叫「${csvName}」，改為加入曾用名。`, 'warning')
    mode = 'former'
  }
  const oldName = member.name
  const former = member.former_names || []
  const payload = mode === 'rename'
    ? { name: csvName, former_names: [...former.filter(n => n !== csvName && n !== oldName), oldName] }
    : (former.includes(csvName) ? null : { former_names: [...former, csvName] })
  if (!payload) return
  const error = getWriteError(await supabase.from('guild_members').update(payload).eq('id', member.id).select('id'))
  if (error) return notify((mode === 'rename' ? '對應已保存，但改名失敗：' : '對應已保存，但加入曾用名失敗：') + error)
  Object.assign(member, payload)
  if (mode === 'rename') notify(`已將成員「${oldName}」改名為「${csvName}」，原名列為曾用名。`, 'success')
}

// 成員的主流派、副流派
const memberSchools = (member) => {
  const main = member.current_school || member.schools?.[0] || ''
  const sub = (member.schools || []).find(s => s && s !== main) || ''
  return { main, sub }
}

// 下拉選單的選擇：新增成員、外援、或指定成員（流派不同時先詢問）
const onLinkChoice = async (player, event) => {
  const value = event.target.value
  event.target.value = ''
  if (!value || isLinking.value) return
  if (value === NEW_MEMBER) return createMemberFromPlayer(player)
  if (value === NOT_MEMBER) return setLink(player.name, value)

  const member = memberById.value.get(value)
  const job = player.job
  const { main, sub } = member ? memberSchools(member) : {}
  if (member && SCHOOL_NAMES.includes(job) && job !== main && job !== sub) {
    jobPrompt.value = { csvName: player.name, job, member, main, sub, value }
    return
  }
  await setLink(player.name, value)
}

// choice：main／sub 更新流派後對應；keep 直接對應；null 取消
const resolveJobPrompt = async (choice) => {
  const prompt = jobPrompt.value
  if (!prompt || isLinking.value) return
  if (!choice) {
    jobPrompt.value = null
    return
  }
  if (choice === 'main' || choice === 'sub') {
    const { member, job, main, sub } = prompt
    const payload = choice === 'main'
      ? { current_school: job, schools: [job, sub].filter(Boolean) }
      : { current_school: main || job, schools: [main, job].filter(Boolean) }
    isLinking.value = true
    const error = getWriteError(await supabase.from('guild_members').update(payload).eq('id', member.id).select('id'))
    isLinking.value = false
    if (error) return notify('更新流派失敗：' + error)
    Object.assign(member, payload)
    notify(`已將「${member.name}」的${choice === 'main' ? '主' : '副'}流派改為${job}。`, 'success')
  }
  jobPrompt.value = null
  await setLink(prompt.csvName, prompt.value)
}

// 以 CSV 玩家建立本聯賽所屬幫會（或俱樂部）的新成員，建立後依名字自動對應
const createMemberFromPlayer = async (player) => {
  const guildId = props.leagueItem.guild_id
  if (members.value.some(m => m.guild_id === guildId && m.name === player.name)) return notify(`${guildName(guildId)}已有成員叫「${player.name}」。`, 'warning')
  if (!confirm(`要把「${player.name}」新增為${guildName(guildId)}的成員嗎？`)) return
  isLinking.value = true
  const { data: { session } } = await supabase.auth.getSession()
  const school = SCHOOL_NAMES.includes(player.job) ? player.job : ''
  const payload = {
    guild_id: guildId,
    name: player.name,
    former_names: [],
    schools: school ? [school] : [],
    current_school: school,
    status: '幫眾',
    notes: '由戰績 CSV 新增',
    created_by: session ? session.user.id : null
  }
  const writeError = getWriteError(await supabase.from('guild_members').insert([payload]).select('id').then(res => {
    if (res.data?.[0]?.id) members.value = [...members.value, { id: res.data[0].id, ...payload }]
    return res
  }))
  isLinking.value = false
  if (writeError) return notify('新增成員失敗：' + writeError)
  // 這場若曾手動標成外援或指定別人，取消手動指定，改由名字自動對應
  if (current.value?.member_links?.[player.name]) await setLink(player.name, '')
  notify(`已新增成員「${player.name}」到${guildName(guildId)}。`, 'success')
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
    notify('無法讀取這個檔案：' + err.message)
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
    return notify('保存戰績數據失敗：' + error)
  }

  if (p.updateOpponent && opp.name && opp.name !== opponents.value[idx]) {
    const nextOpponents = [...opponents.value]
    nextOpponents[idx] = opp.name
    const oppError = getWriteError(await supabase.from('guild_rosters').update({ opponents: nextOpponents }).eq('id', props.leagueItem.id).select('id'))
    if (oppError) notify('戰績已保存，但更新對陣幫會失敗：' + oppError)
    else opponents.value = nextOpponents
  }

  pending.value = null
  isSaving.value = false
  view.value = 'compare'
  await fetchStats()
  await fetchGuildLinks()
}

const deleteStats = async () => {
  if (!current.value) return
  if (!confirm(`確定要刪除第${activeIndex.value + 1}場的戰績數據嗎？`)) return
  const error = getWriteError(await supabase.from('match_stats').delete().eq('id', current.value.id).select('id'))
  if (error) return notify('刪除失敗：' + error)
  await fetchStats()
  await fetchGuildLinks()
}

onMounted(() => {
  fetchStats()
  fetchContext()
})
</script>

<style scoped>
.stats-page { display: flex; flex-direction: column; gap: 14px; }
.stats-header { display: flex; justify-content: space-between; align-items: center; }
.header-left { display: flex; align-items: center; gap: 14px; }
.page-title { margin: 0; font-size: 18px; font-weight: bold; color: var(--c-text); }
.sub-text { font-size: 12px; color: var(--c-muted); margin-top: 2px; }

.match-tabs { display: flex; gap: 8px; flex-wrap: wrap; }
.match-tab { position: relative; background: var(--c-surface); border: 1px solid var(--c-border-strong); color: var(--c-text-3); padding: 7px 14px; border-radius: 8px; font-size: 13px; cursor: pointer; }
.match-tab.active { background: #3b82f6; border-color: #3b82f6; color: #ffffff; font-weight: bold; }
.tab-dot { display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: #22c55e; margin-left: 6px; vertical-align: middle; }

.card, .empty-card, .info-bar { background: var(--c-surface); border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.card { padding: 16px; }
.card-title { margin: 0 0 12px; font-size: 14px; color: var(--c-text); }
.empty-card { padding: 40px 20px; text-align: center; color: var(--c-text-3); font-size: 14px; }
.empty-icon { font-size: 40px; color: var(--c-faint); }
.hint { font-size: 12px; color: var(--c-muted); margin: 6px 0 14px; }
.hint code { background: var(--c-surface-3); padding: 1px 5px; border-radius: 4px; }


.side-name.my { color: var(--c-primary-text); }
.side-name.opp { color: var(--c-danger-text); }
.vs-rows { display: flex; flex-direction: column; gap: 8px; max-width: 720px; margin: 0 auto; }
.vs-row { display: grid; grid-template-columns: 80px 1fr 80px; align-items: center; gap: 10px; }
.vs-val { font-size: 13px; color: var(--c-faint); }
.vs-val.left { text-align: right; }
.vs-val.lead { color: var(--c-text); font-weight: bold; }
.vs-label { text-align: center; font-size: 12px; color: var(--c-muted); margin-bottom: 3px; }
.vs-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; background: var(--c-surface-3); }
.bar-my { background: #3b82f6; }
.bar-opp { background: #ef4444; }


.hint.left { text-align: left; margin: 0 0 10px; }
.att-summary { display: flex; flex-wrap: wrap; gap: 6px; }
.att-chip { background: var(--c-surface-3); color: var(--c-text-2); padding: 4px 10px; border-radius: 12px; font-size: 12px; }
.att-chip.warn { background: var(--c-warn-soft); color: var(--c-warn-text); font-weight: bold; }
.att-groups { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.att-group { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.att-group-title { font-size: 12px; font-weight: bold; color: var(--c-text-3); width: 100%; }
.att-group-title.warn { color: var(--c-warn-text); }
.att-name { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 6px; padding: 3px 8px; font-size: 12px; color: var(--c-text); display: inline-flex; gap: 6px; align-items: baseline; }
.att-name small { color: var(--c-faint); font-size: 11px; }
.link-box { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--c-border-soft); display: flex; flex-direction: column; gap: 8px; }
.link-head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.link-head .att-group-title { width: auto; }
.check-line.small { margin-top: 0; font-size: 12px; color: var(--c-muted); }
.link-mode { font-size: 12px; color: var(--c-muted); display: inline-flex; align-items: center; gap: 6px; }
.link-mode-select { border: 1px solid var(--c-border-strong); border-radius: 6px; padding: 4px 6px; font-size: 12px; }
.job-prompt-text { font-size: 13px; color: var(--c-text-2); line-height: 1.7; margin: 12px 0; }
.job-prompt-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.link-row { display: grid; grid-template-columns: minmax(120px, 1fr) 110px minmax(160px, 1.4fr); gap: 10px; align-items: center; font-size: 13px; }
.link-row.done { color: var(--c-muted); }
.link-csv { font-weight: bold; color: var(--c-text); }
.link-csv small { color: var(--c-faint); font-weight: normal; }
.link-reason { font-size: 12px; color: var(--c-warn-text); }
.link-row.done .link-reason { color: var(--c-muted); }
.link-row .btn-link { justify-self: start; color: var(--c-primary-text); }
.link-select { border: 1px solid var(--c-border-strong); border-radius: 6px; padding: 5px 8px; font-size: 13px; max-width: 100%; }




.hidden-input { display: none; }
.btn-back { background: var(--c-surface); border: 1px solid var(--c-border-strong); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; color: var(--c-text-3); }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 7px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: var(--c-surface-3); color: var(--c-text-2); border: 1px solid var(--c-border-strong); padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; cursor: pointer; font-size: 13px; padding: 0; }

.modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 16px; }
.modal-card { background: var(--c-surface); border-radius: 12px; padding: 20px; color: var(--c-text); width: 460px; max-width: 100%; max-height: 85vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; }
.modal-header h3 { margin: 0; font-size: 16px; }
.close-icon { cursor: pointer; font-size: 20px; color: var(--c-faint); }
.file-line { font-size: 12px; color: var(--c-muted); word-break: break-all; }
.field-label { font-size: 13px; font-weight: bold; margin: 14px 0 8px; }
.side-options { display: flex; flex-direction: column; gap: 8px; }
.side-option { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: 1px solid var(--c-border); border-radius: 8px; cursor: pointer; font-size: 13px; }
.side-option.active { border-color: #3b82f6; background: var(--c-primary-soft); }
.side-option-name { font-weight: bold; flex: 1; }
.side-option-count { color: var(--c-muted); }
.check-line { display: flex; gap: 8px; align-items: flex-start; font-size: 13px; margin-top: 14px; color: var(--c-text-2); }
.warn-text { font-size: 12px; color: var(--c-warn-text); background: var(--c-warn-soft-2); padding: 8px 10px; border-radius: 6px; margin-top: 14px; }
.modal-footer { margin-top: 20px; display: flex; justify-content: flex-end; gap: 10px; }

@media (max-width: 640px) {
  .header-left { flex-direction: column; align-items: flex-start; gap: 8px; }
  .vs-row { grid-template-columns: 64px 1fr 64px; }
  .link-row { grid-template-columns: 1fr; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid var(--c-border-soft); }
}
/* 計分板 */
.export-area { display: flex; flex-direction: column; gap: 14px; }
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
.btn-tool.danger { color: var(--c-danger-text); }
.compare-grid { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(280px, 1fr); gap: 14px; }
.card-title { display: flex; align-items: center; gap: 4px; }
.vs-rows { max-width: none; }

@media (max-width: 900px) {
  .compare-grid { grid-template-columns: 1fr; }
}
@media (max-width: 640px) {
  .scoreboard { padding: 14px; }
  .sb-name { font-size: 16px; }
  .sb-totals { grid-template-columns: repeat(2, 1fr); }
}
</style>
