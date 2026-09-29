<template>
  <div class="league-layout light-theme" @click="closeAllDropdowns">
    <!-- 全局頂部導航列 -->
    <Navbar 
      activeNav="league" 
      :username="username" 
    />

    <div class="league-main">

      <!-- 1. 聯賽列表視圖 -->
      <div v-if="currentView === 'list'">
        <div class="league-header-bar">
          <h2 class="page-title">聯賽列表</h2>
          <div class="header-right-tools">
            <button class="btn-primary" :disabled="accessibleGuildList.length === 0" @click="openCreateView()">+ 創建聯賽</button>
          </div>
        </div>

        <!-- 篩選列 -->
        <div class="filter-card">
          <div class="filter-row">
            <input type="text" v-model="filterTitle" placeholder="標題" class="filter-input-sm" />

            <select v-model="filterType" class="filter-select-sm">
              <option value="">聯賽類型</option>
              <option value="幫會聯賽">幫會聯賽</option>
              <option value="俱樂部比賽">俱樂部比賽</option>
            </select>

            <select v-model="filterParticipant" class="filter-select-sm">
              <option value="">授權幫會</option>
              <option v-for="g in accessibleGuildList" :key="g.id" :value="g.name">{{ g.name }}</option>
            </select>

            <select v-model="filterSort" class="filter-select-sm">
              <option value="desc">創建時間倒序</option>
              <option value="asc">創建時間正序</option>
            </select>

            <button class="btn-query" @click="fetchLeaguesFromDB">查詢</button>
          </div>
        </div>

        <!-- 表格區域 -->
        <div class="table-container margin-t">
          <table class="data-table">
            <thead>
              <tr>
                <th width="140">聯賽標題</th>
                <th width="110">聯賽類型</th>
                <th width="140">授權幫會</th>
                <th width="150">開始時間</th>
                <th width="60">場次</th>
                <th width="130">對陣幫會</th>
                <th width="140">比賽結果</th>
                <th width="60">備註</th>
                <th width="180">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredLeagueList" :key="item.id">
                <td class="font-bold">{{ item.title }}</td>
                <td><span class="type-pill-green">{{ item.type }}</span></td>
                <td>{{ item.participant }}</td>
                <td class="text-gray">{{ item.startTime }}</td>
                <td>{{ item.matchesCount }}</td>

                <!-- 對陣幫會 -->
                <td>
                  <div class="match-opponents-box">
                    <span 
                      v-for="(opp, idx) in item.opponents" 
                      :key="'opp_'+idx" 
                      class="opponent-item clickable"
                      @click="openEditOpponentModal(item)"
                      title="點擊修改對陣幫會"
                    >
                      <template v-if="item.matchesCount > 1">第{{ idx + 1 }}場: </template>{{ opp || '未填選' }}
                    </span>
                  </div>
                </td>

                <!-- 比賽結果 -->
                <td>
                  <div class="match-results-box">
                    <div 
                      v-for="(res, idx) in item.results" 
                      :key="'res_'+idx" 
                      class="result-item-row"
                    >
                      <span v-if="item.matchesCount > 1" class="match-label">第{{ idx + 1 }}場:</span>
                      <span 
                        :class="['result-badge', 'clickable', getResultBadgeClass(res)]"
                        @click="openEditResultModal(item)"
                        title="點擊修改比賽結果"
                      >
                        {{ res || '還沒出' }}
                      </span>
                    </div>
                  </div>
                </td>

                <td>{{ item.notes || '—' }}</td>

                <!-- 操作按鈕 -->
                <td>
                  <div class="action-cell-container">
                    <button class="btn-pill-blue" @click="openRosterBoard(item)">排表</button>
                    <button class="btn-pill-gray" @click="openStatsModal(item)">數據</button>
                    <div class="right-links">
                      <button class="btn-link" @click="openEditLeagueModal(item)">編輯</button>
                      <button class="btn-link text-red" @click="confirmDeleteLeague(item)">刪除</button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredLeagueList.length === 0">
                <td colspan="9" class="empty-cell">
                  {{ accessibleGuildList.length === 0 ? '尚未擁有任何幫會權限，無法檢視賽程' : '暫無符合權限之聯賽資料，點擊右上角「+ 創建聯賽」新增' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. 新建 / 編輯聯賽視圖 -->
      <div v-else-if="currentView === 'form'" class="create-league-container">
        <div class="create-header-bar space-between">
          <div class="left-header-box">
            <button class="btn-back" @click="currentView = 'list'">&lt; 返回聯賽列表</button>
            <h2 class="page-title margin-l">{{ editingLeagueId ? '編輯聯賽' : '新建聯賽' }}</h2>
          </div>
          <div class="right-header-box">
            <button class="btn-secondary" @click="openCopyModal"><i class="mdi mdi-content-copy"></i> 複製已有</button>
          </div>
        </div>

        <p class="sub-hint-text">填寫比賽信息後即可保存。也可以從右上角複製已有場次。</p>

        <div class="form-cards-wrapper margin-t">
          <div class="form-card-block">
            <h3 class="card-section-title">比賽信息</h3>

            <div class="form-row margin-v">
              <label><span class="req">*</span>聯賽類型：</label>
              <div class="toggle-pill-group">
                <button type="button" :class="['pill-toggle-btn', { active: leagueForm.type === '幫會聯賽' }]" @click="leagueForm.type = '幫會聯賽'">幫會聯賽</button>
                <button type="button" :class="['pill-toggle-btn', { active: leagueForm.type === '俱樂部比賽' }]" @click="leagueForm.type = '俱樂部比賽'">俱樂部比賽</button>
              </div>
            </div>

            <div class="form-row margin-v">
              <label><span class="req">*</span>聯賽名稱：</label>
              <div class="input-with-counter flex-1">
                <input type="text" v-model="leagueForm.title" maxlength="20" placeholder="請輸入聯賽名稱" class="input-field full-width" />
                <span class="char-count">{{ leagueForm.title.length }} / 20</span>
              </div>
            </div>

            <div class="form-row margin-v">
              <label><span class="req">*</span>開始時間：</label>
              <input type="date" v-model="leagueForm.date" class="input-field date-picker" />
              <select v-model="leagueForm.time" class="select-field margin-l">
                <option value="20:00">20:00</option>
                <option value="20:30">20:30</option>
                <option value="21:00">21:00</option>
              </select>

              <label class="margin-l-lg"><span class="req">*</span>場次數：</label>
              <div class="toggle-pill-group">
                <button type="button" :class="['pill-toggle-btn-sm', { active: leagueForm.matchesCount === 1 }]" @click="leagueForm.matchesCount = 1">1</button>
                <button type="button" :class="['pill-toggle-btn-sm', { active: leagueForm.matchesCount === 2 }]" @click="leagueForm.matchesCount = 2">2</button>
              </div>
            </div>

            <div class="form-row margin-v">
              <label><span class="req">*</span>授權幫會：</label>
              <select v-model="leagueForm.participant" class="select-field flex-1">
                <option v-for="g in accessibleGuildList" :key="g.id" :value="g.name">{{ g.name }}</option>
              </select>
            </div>

            <div class="form-row margin-v">
              <label>備註：</label>
              <input type="text" v-model="leagueForm.notes" placeholder="選填" class="input-field flex-1" />
            </div>
          </div>

          <div class="form-card-block margin-t">
            <h3 class="card-section-title">報名與排表</h3>
            <div class="form-row margin-v">
              <label>排表展示：</label>
              <span class="display-config-tags">全部團隊、職能、職能標籤、橙武、一線牽、錄屏</span>
              <button type="button" class="btn-link margin-l" @click="showDisplaySettingModal = true">設置</button>
            </div>
          </div>

          <div class="form-bottom-actions space-between align-center margin-t">
            <label class="checkbox-label">
              <input type="checkbox" v-model="leagueForm.saveAsDefault" />
              <span>保存為創建幫會聯賽的默認配置</span>
            </label>

            <button class="btn-primary btn-large" :disabled="isSaving" @click="saveLeagueForm">
              {{ isSaving ? '保存中...' : '保存' }}
            </button>
          </div>
        </div>
      </div>

      <!-- 3. 陣容排表頁面 -->
      <div v-else-if="currentView === 'roster'">
        <RosterBoard 
          :leagueItem="activeLeagueForRoster" 
          :userProfile="userProfile"
          @back="currentView = 'list'" 
        />
      </div>
    </div>

    <!-- 比賽結果修改彈窗 -->
    <div v-if="showResultModal" class="modal-overlay" @click.self="showResultModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>比賽結果</h3>
          <span class="close-btn" @click="showResultModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div v-for="idx in activeEditingLeague.matchesCount" :key="idx" class="result-radio-row margin-v">
            <div class="match-label-title" v-if="activeEditingLeague.matchesCount > 1">第 {{ idx }} 場</div>
            <div class="radio-group">
              <label class="radio-item">
                <input type="radio" :name="'result_'+idx" value="還沒出" v-model="editingResults[idx-1]" /> 還沒出
              </label>
              <label class="radio-item">
                <input type="radio" :name="'result_'+idx" value="我方贏" v-model="editingResults[idx-1]" /> 我方贏
              </label>
              <label class="radio-item">
                <input type="radio" :name="'result_'+idx" value="對方贏" v-model="editingResults[idx-1]" /> 對方贏
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer flex-end">
          <button class="btn-secondary" @click="showResultModal = false">取消</button>
          <button class="btn-primary margin-l" @click="saveMatchResults">保存</button>
        </div>
      </div>
    </div>

    <!-- 對陣幫會修改彈窗 -->
    <div v-if="showOpponentModal" class="modal-overlay" @click.self="showOpponentModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>對陣幫會</h3>
          <span class="close-btn" @click="showOpponentModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row margin-v" v-for="idx in activeEditingLeague.matchesCount" :key="idx">
            <label v-if="activeEditingLeague.matchesCount > 1">第 {{ idx }} 場：</label>
            <input type="text" v-model="editingOpponents[idx-1]" placeholder="請輸入對手名稱或 未填選" class="input-field flex-1" />
          </div>
        </div>
        <div class="modal-footer flex-end">
          <button class="btn-secondary" @click="showOpponentModal = false">取消</button>
          <button class="btn-primary margin-l" @click="saveMatchOpponents">保存</button>
        </div>
      </div>
    </div>

    <!-- 複製已有聯賽 Modal -->
    <div v-if="showCopyModal" class="modal-overlay" @click.self="showCopyModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>複製已有聯賽</h3>
          <span class="close-btn" @click="showCopyModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <p class="sub-hint-text margin-b">選一場已有聯賽，改好日期後創建。預設帶上場配置與語音設定。</p>

          <div class="form-row margin-v">
            <label><span class="req">*</span>源聯賽：</label>
            <select v-model="copySourceLeagueId" class="select-field flex-1">
              <option v-for="l in filteredLeagueList" :key="l.id" :value="l.id">
                {{ l.title }} ({{ l.participant }} - {{ l.startTime }})
              </option>
            </select>
          </div>

          <div class="form-row margin-v">
            <label><span class="req">*</span>新日期：</label>
            <input type="date" v-model="copyTargetDate" class="input-field date-picker" />
            <select v-model="copyTargetTime" class="select-field margin-l">
              <option value="20:00">20:00</option>
              <option value="20:30">20:30</option>
              <option value="21:00">21:00</option>
            </select>
          </div>

          <div class="form-row margin-v">
            <label>聯賽名字：</label>
            <input 
              type="text" 
              v-model="copyTargetTitle" 
              placeholder="自動取源聯賽名，也可手動修改" 
              class="input-field flex-1" 
            />
          </div>
        </div>

        <div class="modal-footer flex-end">
          <button class="btn-secondary" @click="showCopyModal = false">取消</button>
          <button class="btn-primary margin-l" :disabled="isCopying" @click="executeCopyLeague">
            {{ isCopying ? '複製中...' : '複製並創建' }}
          </button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../utils/supabase'
import Navbar from '../components/layout/Navbar.vue'
import RosterBoard from './league/RosterBoard.vue'

const username = ref('VIP')
const userProfile = ref(null)
const allGuilds = ref([])

const currentView = ref('list')
const activeLeagueForRoster = ref(null)
const editingLeagueId = ref(null)
const isSaving = ref(false)

const filterTitle = ref('')
const filterType = ref('')
const filterParticipant = ref('')
const filterSort = ref('desc')

const leagueList = ref([])

const leagueForm = ref({
  type: '幫會聯賽',
  title: '',
  date: new Date().toISOString().split('T')[0],
  time: '20:00',
  matchesCount: 2,
  participant: '',
  notes: '',
  saveAsDefault: false
})

const showResultModal = ref(false)
const showOpponentModal = ref(false)
const activeEditingLeague = ref(null)
const editingResults = ref([])
const editingOpponents = ref([])

// 複製已有 Modal 狀態
const showCopyModal = ref(false)
const copySourceLeagueId = ref('')
const copyTargetDate = ref(new Date().toISOString().split('T')[0])
const copyTargetTime = ref('20:00')
const copyTargetTitle = ref('')
const isCopying = ref(false)

const accessibleGuildList = computed(() => {
  if (!userProfile.value) return []
  if (userProfile.value.role === 'super_admin') return allGuilds.value
  
  const userGuildIds = userProfile.value.guild_ids || (userProfile.value.guild_id ? [userProfile.value.guild_id] : [])
  return allGuilds.value.filter(g => userGuildIds.includes(g.id))
})

const getNormalizedArray = (arr, targetLen, defaultValue) => {
  if (!Array.isArray(arr) || arr.length === 0) {
    return Array(targetLen).fill(defaultValue)
  }
  if (arr.length < targetLen) {
    return [...arr, ...Array(targetLen - arr.length).fill(defaultValue)]
  }
  return arr.slice(0, targetLen)
}

const fetchLeaguesFromDB = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
  if (profile) {
    userProfile.value = profile
    username.value = session.user.email.split('@')[0]
  }

  const { data: guildsData } = await supabase.from('guilds').select('*')
  if (guildsData) {
    allGuilds.value = guildsData
    if (accessibleGuildList.value.length > 0 && !leagueForm.value.participant) {
      leagueForm.value.participant = accessibleGuildList.value[0].name
    }
  }

  const { data: rostersData } = await supabase.from('guild_rosters').select('*').order('updated_at', { ascending: filterSort.value === 'asc' })

  if (rostersData) {
    leagueList.value = rostersData.map(r => {
      const gName = allGuilds.value.find(g => g.id === r.guild_id)?.name || '未指派幫會'
      const count = r.matches_count || 1

      return {
        id: r.id,
        guild_id: r.guild_id,
        title: r.title,
        type: r.type,
        participant: gName,
        guild: gName,
        startTime: r.start_time,
        matchesCount: count,
        opponents: getNormalizedArray(r.opponents, count, '未填選'),
        results: getNormalizedArray(r.results, count, '還沒出'),
        notes: r.notes || '',
        matrixTeams: r.matrix_teams
      }
    })
  }
}

const filteredLeagueList = computed(() => {
  const accessibleGuildIds = accessibleGuildList.value.map(g => g.id)

  return leagueList.value.filter(item => {
    const hasPermission = userProfile.value?.role === 'super_admin' || accessibleGuildIds.includes(item.guild_id)
    const matchTitle = !filterTitle.value || item.title.includes(filterTitle.value)
    const matchType = !filterType.value || item.type === filterType.value
    const matchParticipant = !filterParticipant.value || item.participant === filterParticipant.value
    return hasPermission && matchTitle && matchType && matchParticipant
  })
})

const getResultBadgeClass = (res) => {
  if (res === '我方贏') return 'badge-win'
  if (res === '對方贏') return 'badge-loss'
  return 'badge-gray'
}

const openEditResultModal = (item) => {
  activeEditingLeague.value = item
  editingResults.value = getNormalizedArray(item.results, item.matchesCount, '還沒出')
  showResultModal.value = true
}

const saveMatchResults = async () => {
  if (!activeEditingLeague.value) return
  await supabase.from('guild_rosters').update({ results: editingResults.value }).eq('id', activeEditingLeague.value.id)
  await fetchLeaguesFromDB()
  showResultModal.value = false
}

const openEditOpponentModal = (item) => {
  activeEditingLeague.value = item
  editingOpponents.value = getNormalizedArray(item.opponents, item.matchesCount, '未填選')
  showOpponentModal.value = true
}

const saveMatchOpponents = async () => {
  if (!activeEditingLeague.value) return
  const safeOpponents = editingOpponents.value.map(o => o.trim() || '未填選')
  await supabase.from('guild_rosters').update({ opponents: safeOpponents }).eq('id', activeEditingLeague.value.id)
  await fetchLeaguesFromDB()
  showOpponentModal.value = false
}

const openCopyModal = () => {
  if (filteredLeagueList.value.length === 0) {
    return alert('暫無可複製的已有聯賽！')
  }
  copySourceLeagueId.value = filteredLeagueList.value[0].id
  copyTargetTitle.value = filteredLeagueList.value[0].title
  copyTargetDate.value = new Date().toISOString().split('T')[0]
  copyTargetTime.value = '20:00'
  showCopyModal.value = true
}

watch(copySourceLeagueId, (newId) => {
  const src = leagueList.value.find(l => l.id === newId)
  if (src) {
    copyTargetTitle.value = src.title
  }
})

// ★ 核心4：複製源聯賽陣容連同 templateConfig，離幫成員自動清空 ★
const executeCopyLeague = async () => {
  if (!copySourceLeagueId.value) return alert('請選擇源聯賽！')
  if (!copyTargetTitle.value.trim()) return alert('請輸入聯賽名字！')

  const srcLeague = leagueList.value.find(l => l.id === copySourceLeagueId.value)
  if (!srcLeague) return alert('找不到源聯賽！')

  isCopying.value = true
  try {
    const { data: currentMembers } = await supabase
      .from('guild_members')
      .select('id, name')
      .eq('guild_id', srcLeague.guild_id)

    const currentMemberIds = new Set((currentMembers || []).map(m => m.id))
    const currentMemberNames = new Set((currentMembers || []).map(m => m.name ? m.name.trim().toLowerCase() : ''))

    const cleanMatrixTeams = JSON.parse(JSON.stringify(srcLeague.matrixTeams || []))

    cleanMatrixTeams.forEach(team => {
      if (team && Array.isArray(team.squads)) {
        team.squads.forEach(squad => {
          if (squad && Array.isArray(squad.slots)) {
            squad.slots.forEach(slot => {
              slot.id = Math.random()
              
              if (slot.assignedMember) {
                const mId = slot.assignedMember.id
                const mName = slot.assignedMember.name ? slot.assignedMember.name.trim().toLowerCase() : ''
                const stillInGuild = currentMemberIds.has(mId) || currentMemberNames.has(mName)

                // 若已離幫，清空該席位，但完整保留 templateConfig 席位配置！
                if (!stillInGuild) {
                  slot.assignedMember = null
                  slot.roles = []
                  slot.jueji = ''
                  slot.qunxia = ''
                  slot.zhuangbei = ''
                }
              }

              if (!slot.templateConfig) {
                slot.templateConfig = { schools: [], roles: [], jueji: '', qunxia: '', zhuangbei: '', desc: '' }
              }
            })
          }
        })
      }
    })

    const count = srcLeague.matchesCount || 1
    const payload = {
      guild_id: srcLeague.guild_id,
      title: copyTargetTitle.value.trim(),
      type: srcLeague.type || '幫會聯賽',
      start_time: `${copyTargetDate.value} ${copyTargetTime.value}`,
      matches_count: count,
      opponents: Array(count).fill('未填選'),
      results: Array(count).fill('還沒出'),
      notes: srcLeague.notes || '',
      matrix_teams: cleanMatrixTeams
    }

    const { error } = await supabase.from('guild_rosters').insert([payload])
    if (error) throw error

    alert('複製聯賽成功！已為您帶入原陣容與席位配置，並自動將離幫成員席位清空為空格。')
    showCopyModal.value = false
    await fetchLeaguesFromDB()
    currentView.value = 'list'
  } catch (err) {
    alert('複製失敗：' + err.message)
  } finally {
    isCopying.value = false
  }
}

const openCreateView = () => {
  if (accessibleGuildList.value.length === 0) return alert('您尚未獲得任何幫會權限，無法創建聯賽！')
  editingLeagueId.value = null
  leagueForm.value = {
    type: '幫會聯賽',
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    matchesCount: 2,
    participant: accessibleGuildList.value[0].name,
    notes: '',
    saveAsDefault: false
  }
  currentView.value = 'form'
}

const openEditLeagueModal = (item) => {
  editingLeagueId.value = item.id
  const [datePart, timePart] = (item.startTime || '2026-10-24 20:00').split(' ')
  leagueForm.value = {
    type: item.type || '幫會聯賽',
    title: item.title,
    date: datePart || '2026-10-24',
    time: timePart || '20:00',
    matchesCount: item.matchesCount || 1,
    participant: item.participant,
    notes: item.notes || '',
    saveAsDefault: false
  }
  currentView.value = 'form'
}

const saveLeagueForm = async () => {
  if (!leagueForm.value.title.trim()) return alert('請輸入聯賽名稱！')

  const targetGuild = allGuilds.value.find(g => g.name === leagueForm.value.participant)
  if (!targetGuild) return alert('請選擇有效的授權幫會！')

  isSaving.value = true
  const count = leagueForm.value.matchesCount || 1

  const payload = {
    guild_id: targetGuild.id,
    title: leagueForm.value.title.trim(),
    type: leagueForm.value.type,
    start_time: `${leagueForm.value.date} ${leagueForm.value.time}`,
    matches_count: count,
    notes: leagueForm.value.notes.trim()
  }

  if (editingLeagueId.value) {
    const existing = leagueList.value.find(l => l.id === editingLeagueId.value)
    payload.opponents = getNormalizedArray(existing?.opponents, count, '未填選')
    payload.results = getNormalizedArray(existing?.results, count, '還沒出')
  } else {
    payload.opponents = Array(count).fill('未填選')
    payload.results = Array(count).fill('還沒出')
    payload.matrix_teams = []
  }

  try {
    if (editingLeagueId.value) {
      await supabase.from('guild_rosters').update(payload).eq('id', editingLeagueId.value)
    } else {
      await supabase.from('guild_rosters').insert([payload])
    }

    await fetchLeaguesFromDB()
    currentView.value = 'list'
  } catch (err) {
    alert('保存聯賽失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}

const openRosterBoard = (item) => {
  activeLeagueForRoster.value = item
  currentView.value = 'roster'
}

const confirmDeleteLeague = async (item) => {
  if (confirm(`確定要刪除聯賽「${item.title}」嗎？`)) {
    await supabase.from('guild_rosters').delete().eq('id', item.id)
    await fetchLeaguesFromDB()
  }
}

const openStatsModal = (item) => alert(`聯賽「${item.title}」之對陣數據面板籌備中...`)

onMounted(fetchLeaguesFromDB)
</script>

<style scoped>
.league-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f4f6f9; color: #2c3e50; }
.league-main { flex: 1; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; }

.league-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.page-title { margin: 0; font-size: 18px; font-weight: bold; color: #1e293b; }
.header-right-tools { display: flex; align-items: center; }

.filter-card { background: #ffffff; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.filter-input-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; width: 130px; }
.filter-select-sm { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; background: white; cursor: pointer; }
.btn-query { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-query:hover { background: #f8fafc; }

.table-container { background: #ffffff; border-radius: 8px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 14px 12px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

.type-pill-green { background: #dcfce7; color: #15803d; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 12px; display: inline-block; }
.match-opponents-box { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #475569; }
.opponent-item { display: inline-block; padding: 2px 0; }
.clickable { cursor: pointer; transition: opacity 0.2s; }
.clickable:hover { opacity: 0.7; }

.match-results-box { display: flex; flex-direction: column; gap: 6px; }
.result-item-row { display: flex; align-items: center; gap: 6px; }
.match-label { font-size: 12px; color: #64748b; }
.result-badge { padding: 4px 12px; border-radius: 14px; font-size: 11px; font-weight: bold; width: fit-content; text-align: center; }
.badge-win { background: #3b82f6; color: #ffffff; }
.badge-loss { background: #ef4444; color: #ffffff; }
.badge-gray { background: #e2e8f0; color: #64748b; }

.action-cell-container { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.right-links { display: flex; align-items: center; gap: 4px; flex-direction: column; align-items: flex-start; margin-left: 6px; }
.btn-pill-blue { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 5px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; font-weight: bold; }
.btn-pill-blue:hover { background: #dbeafe; }
.btn-pill-gray { background: #f8fafc; color: #475569; border: 1px solid #cbd5e1; padding: 5px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-pill-gray:hover { background: #f1f5f9; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; max-height: 85vh; overflow-y: auto; }
.small-card { width: 380px; }
.medium-card { width: 520px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.modal-footer { margin-top: 20px; display: flex; gap: 10px; }
.flex-end { justify-content: flex-end; }

.result-radio-row { margin-bottom: 15px; }
.match-label-title { font-weight: bold; font-size: 14px; color: #1e293b; margin-bottom: 8px; }
.radio-group { display: flex; gap: 16px; align-items: center; }
.radio-item { font-size: 13px; color: #475569; cursor: pointer; display: flex; align-items: center; gap: 4px; }

.create-league-container { background: #ffffff; border-radius: 12px; padding: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.create-header-bar { display: flex; align-items: center; }
.left-header-box, .right-header-box { display: flex; align-items: center; }
.btn-back { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #475569; }
.sub-hint-text { color: #94a3b8; font-size: 12px; margin: 8px 0 20px 0; }

.form-card-block { border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; background: #ffffff; }
.card-section-title { font-size: 15px; font-weight: bold; color: #1e293b; margin: 0 0 16px 0; }
.form-row { display: flex; align-items: center; font-size: 13px; }
.form-row label { width: 100px; font-weight: bold; color: #334155; }
.input-field, .select-field { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.date-picker { width: 140px; }

.toggle-pill-group { display: flex; gap: 8px; }
.pill-toggle-btn { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 6px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; }
.pill-toggle-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; font-weight: bold; }
.pill-toggle-btn-sm { background: #f1f5f9; border: 1px solid #cbd5e1; color: #475569; padding: 4px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.pill-toggle-btn-sm.active { background: #3b82f6; color: white; border-color: #3b82f6; font-weight: bold; }

.input-with-counter { position: relative; display: flex; align-items: center; }
.char-count { position: absolute; right: 12px; color: #94a3b8; font-size: 12px; }

.display-config-tags { color: #64748b; font-size: 13px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; cursor: pointer; }
.btn-large { padding: 10px 32px; font-size: 14px; border-radius: 8px; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }
.text-gray { color: #64748b; }
.empty-cell { text-align: center; color: #94a3b8; padding: 40px; }

.space-between { justify-content: space-between; }
.align-center { align-items: center; }
.flex-1 { flex: 1; }
.full-width { width: 100%; }
.font-bold { font-weight: bold; }
.margin-l { margin-left: 12px; }
.margin-l-lg { margin-left: 24px; }
.margin-xs { margin-left: 4px; }
.margin-t { margin-top: 16px; }
.margin-v { margin: 12px 0; }
.req { color: #ef4444; }
</style>