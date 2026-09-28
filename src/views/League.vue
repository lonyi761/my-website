<template>
  <div :class="['league-layout', isDarkMode ? 'dark-theme' : 'light-theme']" @click="closeAllDropdowns">
    <!-- 頂部導航列 -->
    <Navbar 
      activeNav="league" 
      :isDarkMode="isDarkMode" 
      :username="username" 
      @toggle-theme="isDarkMode = !isDarkMode" 
    />

    <!-- 主要內容區 -->
    <div class="league-main">
      <!-- 頂部標題與按鈕工具列 -->
      <div class="league-header-bar">
        <h2 class="page-title">聯賽列表</h2>

        <div class="header-right-tools">
          <span class="guide-text">查看引導</span>
          <button class="icon-btn-setting" title="頁面設置">
            <i class="mdi mdi-cog-outline"></i> 頁面設置
          </button>
          <button class="btn-primary" @click="createLeague">+ 創建聯賽</button>
        </div>
      </div>

      <!-- 篩選卡片 -->
      <div class="filter-card">
        <div class="filter-row">
          <!-- 1. 標題搜尋 -->
          <input 
            type="text" 
            v-model="filterTitle" 
            placeholder="標題" 
            class="filter-input-text" 
          />

          <!-- 2. 成員分組 -->
          <div class="custom-select-wrapper" @click.stop>
            <div class="custom-select-input" @click="toggleDropdown('group')">
              <span :class="{ 'placeholder-text': !filterGroup }">
                {{ filterGroup || '成員分組' }}
              </span>
              <i :class="['mdi', 'mdi-chevron-down', 'select-arrow', { rotate: activeDropdown === 'group' }]"></i>
            </div>
            <div v-if="activeDropdown === 'group'" class="custom-select-dropdown">
              <div class="dropdown-group-label">幫會</div>
              <div 
                v-for="g in guildOptions" 
                :key="g" 
                :class="['dropdown-item', { selected: filterGroup === g }]"
                @click="selectOption('group', g)"
              >
                {{ g }}
              </div>
              <div class="dropdown-group-label">其他</div>
              <div 
                v-for="o in otherGroupOptions" 
                :key="o" 
                :class="['dropdown-item', { selected: filterGroup === o }]"
                @click="selectOption('group', o)"
              >
                {{ o }}
              </div>
            </div>
          </div>

          <!-- 3. 聯賽類型 (精簡為：幫會聯賽 / 俱樂部比賽) -->
          <div class="custom-select-wrapper" @click.stop>
            <div class="custom-select-input" @click="toggleDropdown('type')">
              <span :class="{ 'placeholder-text': !filterType }">
                {{ filterType || '聯賽類型' }}
              </span>
              <i :class="['mdi', 'mdi-chevron-down', 'select-arrow', { rotate: activeDropdown === 'type' }]"></i>
            </div>
            <div v-if="activeDropdown === 'type'" class="custom-select-dropdown">
              <div 
                v-for="t in typeOptions" 
                :key="t" 
                :class="['dropdown-item', { selected: filterType === t }]"
                @click="selectOption('type', t)"
              >
                {{ t }}
              </div>
            </div>
          </div>

          <!-- 4. 參與者 (選項與成員分組相同) -->
          <div class="custom-select-wrapper" @click.stop>
            <div class="custom-select-input" @click="toggleDropdown('participant')">
              <span :class="{ 'placeholder-text': !filterParticipant }">
                {{ filterParticipant || '參與者' }}
              </span>
              <i :class="['mdi', 'mdi-chevron-down', 'select-arrow', { rotate: activeDropdown === 'participant' }]"></i>
            </div>
            <div v-if="activeDropdown === 'participant'" class="custom-select-dropdown">
              <div class="dropdown-group-label">幫會</div>
              <div 
                v-for="g in guildOptions" 
                :key="g" 
                :class="['dropdown-item', { selected: filterParticipant === g }]"
                @click="selectOption('participant', g)"
              >
                {{ g }}
              </div>
              <div class="dropdown-group-label">其他</div>
              <div 
                v-for="o in otherGroupOptions" 
                :key="o" 
                :class="['dropdown-item', { selected: filterParticipant === o }]"
                @click="selectOption('participant', o)"
              >
                {{ o }}
              </div>
            </div>
          </div>

          <!-- 5. 排序 -->
          <div class="custom-select-wrapper" @click.stop>
            <div class="custom-select-input" @click="toggleDropdown('sort')">
              <span>{{ filterSortLabel }}</span>
              <i :class="['mdi', 'mdi-chevron-down', 'select-arrow', { rotate: activeDropdown === 'sort' }]"></i>
            </div>
            <div v-if="activeDropdown === 'sort'" class="custom-select-dropdown">
              <div 
                v-for="s in sortOptions" 
                :key="s.value" 
                :class="['dropdown-item', { selected: filterSort === s.value }]"
                @click="selectOption('sort', s.value)"
              >
                {{ s.label }}
              </div>
            </div>
          </div>

          <!-- 6. 查詢按鈕 -->
          <button class="btn-query" @click="handleSearch">查詢</button>
        </div>
      </div>

      <!-- 表格視圖 (全新 9 欄位) -->
      <div class="table-container margin-t">
        <table class="data-table">
          <thead>
            <tr>
              <th>聯賽標題</th>
              <th width="110">聯賽類型</th>
              <th width="130">參與者</th>
              <th width="150">開始時間</th>
              <th width="60">場次</th>
              <th>對陣幫會</th>
              <th>比賽結果</th>
              <th>備註</th>
              <th width="140">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in filteredLeagueList" :key="item.id">
              <td class="font-bold">{{ item.title }}</td>
              <td><span class="text-green">{{ item.type }}</span></td>
              <td>{{ item.participant }}</td>
              <td class="text-gray">{{ item.startTime }}</td>
              <td>{{ item.matchCount }}</td>

              <!-- 對陣幫會 (上下垂直疊加呈現) -->
              <td>
                <div class="clickable-cell" @click="openOpponentModal(item)" title="點擊編輯對陣幫會">
                  <div class="opponents-flex-vertical">
                    <template v-for="(opp, mIdx) in item.matchCount" :key="mIdx">
                      <div class="vertical-row">
                        <span v-if="item.matchCount > 1" class="match-tag-label">第{{ mIdx + 1 }}場:</span>
                        <span :class="['opponent-pill', { unset: !item.opponents[mIdx] }]">
                          {{ item.opponents[mIdx] || '未填選' }}
                        </span>
                      </div>
                    </template>
                  </div>
                </div>
              </td>

              <!-- 比賽結果 (上下垂直疊加呈現我方贏 / 對方贏標籤) -->
              <td>
                <div class="clickable-cell" @click="openResultModal(item)" title="點擊編輯比賽結果">
                  <div class="results-flex-vertical">
                    <template v-for="(res, mIdx) in item.matchCount" :key="mIdx">
                      <div class="vertical-row">
                        <span v-if="item.matchCount > 1" class="match-tag-label">第{{ mIdx + 1 }}場:</span>
                        <span v-if="item.results[mIdx] === 'win'" class="res-badge win">我方贏</span>
                        <span v-else-if="item.results[mIdx] === 'lose'" class="res-badge lose">對方贏</span>
                        <span v-else class="res-badge unset">還沒出</span>
                      </div>
                    </template>
                  </div>
                </div>
              </td>

              <td class="text-gray">{{ item.notes || '—' }}</td>

              <td>
                <button class="btn-pill-blue" @click="openRoster(item)">排表</button>
                <button class="btn-pill-gray margin-l">數據</button>
                <button class="btn-link text-red margin-l" @click="confirmDeleteLeague(item)">刪除</button>
              </td>
            </tr>
            <tr v-if="filteredLeagueList.length === 0">
              <td colspan="9" class="empty-cell">暫無聯賽資料</td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>

    <!-- 1. 編輯對陣幫會 Modal -->
    <div v-if="showOpponentModal" class="modal-overlay" @click.self="showOpponentModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>編輯對陣幫會</h3>
          <span class="close-btn" @click="showOpponentModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>第 1 場：</label>
            <input type="text" v-model="tempOpponents[0]" placeholder="請輸入對陣幫會名稱" class="flex-1" />
          </div>
          <div v-if="activeLeagueItem?.matchCount === 2" class="form-row margin-t">
            <label>第 2 場：</label>
            <input type="text" v-model="tempOpponents[1]" placeholder="請輸入對陣幫會名稱" class="flex-1" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showOpponentModal = false">取消</button>
          <button class="btn-primary" @click="saveOpponents">保存</button>
        </div>
      </div>
    </div>

    <!-- 2. 編輯比賽結果 Modal -->
    <div v-if="showResultModal" class="modal-overlay" @click.self="showResultModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>比賽結果</h3>
          <span class="close-btn" @click="showResultModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <!-- 第 1 場 -->
          <div class="result-match-block">
            <div class="match-title-label">第 1 場</div>
            <div class="radio-options-row">
              <label class="radio-item">
                <input type="radio" v-model="tempResults[0]" value="unset" />
                <span>還沒出</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="tempResults[0]" value="win" />
                <span>我方贏</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="tempResults[0]" value="lose" />
                <span>對方贏</span>
              </label>
            </div>
          </div>

          <!-- 第 2 場 (當場次為 2 時顯示) -->
          <div v-if="activeLeagueItem?.matchCount === 2" class="result-match-block margin-t">
            <div class="match-title-label">第 2 場</div>
            <div class="radio-options-row">
              <label class="radio-item">
                <input type="radio" v-model="tempResults[1]" value="unset" />
                <span>還沒出</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="tempResults[1]" value="win" />
                <span>我方贏</span>
              </label>
              <label class="radio-item">
                <input type="radio" v-model="tempResults[1]" value="lose" />
                <span>對方贏</span>
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showResultModal = false">取消</button>
          <button class="btn-primary" @click="saveResults">保存</button>
        </div>
      </div>
    </div>

    <!-- 3. 置中刪除確認 Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-card confirm-modal-card">
        <div class="confirm-modal-body">
          <div class="warning-icon-wrapper">
            <i class="mdi mdi-alert-circle warning-icon"></i>
          </div>
          <h3 class="confirm-title">{{ confirmTitle }}</h3>
          <p class="confirm-msg">{{ confirmMessage }}</p>
        </div>
        <div class="confirm-modal-footer">
          <button class="btn-secondary" @click="showConfirmModal = false">取消</button>
          <button class="btn-primary btn-red" @click="executeConfirmAction">刪除</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Navbar from '../components/layout/Navbar.vue'

const router = useRouter()
const isDarkMode = ref(false)
const username = ref('VIP')

// 篩選狀態
const filterTitle = ref('')
const filterGroup = ref('')
const filterType = ref('')
const filterParticipant = ref('')
const filterSort = ref('created_desc')

const activeDropdown = ref(null)

// 幫會選項與聯賽類型（僅分：幫會聯賽 / 俱樂部比賽）
const guildOptions = ['百錵谷酒池肉林']
const otherGroupOptions = ['遊客']
const typeOptions = ['幫會聯賽', '俱樂部比賽']

const sortOptions = [
  { label: '創建時間倒序', value: 'created_desc' },
  { label: '創建時間正序', value: 'created_asc' },
  { label: '聯賽時間倒序', value: 'league_desc' },
  { label: '聯賽時間正序', value: 'league_asc' }
]

const filterSortLabel = computed(() => {
  const found = sortOptions.find(s => s.value === filterSort.value)
  return found ? found.label : '創建時間倒序'
})

// 置中刪除確認 Modal
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmActionCallback = null

const triggerConfirmModal = (title, message, onConfirm) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmActionCallback = onConfirm
  showConfirmModal.value = true
}

const executeConfirmAction = () => {
  if (confirmActionCallback) confirmActionCallback()
  showConfirmModal.value = false
}

// 聯賽列表資料
const leagueList = ref([
  {
    id: 1,
    title: '幫會聯賽',
    type: '幫會聯賽',
    participant: '百錵谷酒池肉林',
    guild: '百錵谷酒池肉林',
    startTime: '2026-10-10 20:00',
    matchCount: 2,
    opponents: ['未填選', '未填選'],
    results: ['win', 'lose'],
    notes: '1'
  },
  {
    id: 2,
    title: '俱樂部交流賽',
    type: '俱樂部比賽',
    participant: '百錵谷酒池肉林',
    guild: '百錵谷酒池肉林',
    startTime: '2026-10-17 20:00',
    matchCount: 1,
    opponents: ['未填選'],
    results: ['win'],
    notes: ''
  }
])

const toggleDropdown = (dropdownName) => {
  if (activeDropdown.value === dropdownName) {
    activeDropdown.value = null
  } else {
    activeDropdown.value = dropdownName
  }
}

const selectOption = (category, value) => {
  if (category === 'group') filterGroup.value = value
  if (category === 'type') filterType.value = value
  if (category === 'participant') filterParticipant.value = value
  if (category === 'sort') filterSort.value = value
  activeDropdown.value = null
}

const closeAllDropdowns = () => {
  activeDropdown.value = null
}

const handleSearch = () => {}

const filteredLeagueList = computed(() => {
  return leagueList.value.filter(item => {
    const matchTitle = !filterTitle.value || item.title.includes(filterTitle.value) || item.guild.includes(filterTitle.value)
    const matchGroup = !filterGroup.value || item.guild === filterGroup.value
    const matchType = !filterType.value || item.type === filterType.value
    const matchPart = !filterParticipant.value || item.participant === filterParticipant.value
    return matchTitle && matchGroup && matchType && matchPart
  })
})

// 對陣幫會 Modal
const showOpponentModal = ref(false)
const activeLeagueItem = ref(null)
const tempOpponents = ref(['', ''])

const openOpponentModal = (item) => {
  activeLeagueItem.value = item
  tempOpponents.value = [item.opponents[0] || '', item.opponents[1] || '']
  showOpponentModal.value = true
}

const saveOpponents = () => {
  if (activeLeagueItem.value) {
    activeLeagueItem.value.opponents[0] = tempOpponents.value[0].trim() || '未填選'
    if (activeLeagueItem.value.matchCount === 2) {
      activeLeagueItem.value.opponents[1] = tempOpponents.value[1].trim() || '未填選'
    }
  }
  showOpponentModal.value = false
}

// 比賽結果 Modal
const showResultModal = ref(false)
const tempResults = ref(['unset', 'unset'])

const openResultModal = (item) => {
  activeLeagueItem.value = item
  tempResults.value = [item.results[0] || 'unset', item.results[1] || 'unset']
  showResultModal.value = true
}

const saveResults = () => {
  if (activeLeagueItem.value) {
    activeLeagueItem.value.results[0] = tempResults.value[0]
    if (activeLeagueItem.value.matchCount === 2) {
      activeLeagueItem.value.results[1] = tempResults.value[1]
    }
  }
  showResultModal.value = false
}

const createLeague = () => {
  const title = prompt('請輸入聯賽標題：', '幫會聯賽')
  if (title && title.trim()) {
    leagueList.value.unshift({
      id: Date.now(),
      title: title.trim(),
      type: '幫會聯賽',
      participant: '百錵谷酒池肉林',
      guild: '百錵谷酒池肉林',
      startTime: '2026-10-24 20:00',
      matchCount: 2,
      opponents: ['未填選', '未填選'],
      results: ['unset', 'unset'],
      notes: ''
    })
  }
}

const openRoster = (item) => {
  alert(`開啟聯賽【${item.title}】的排表頁面`)
}

const confirmDeleteLeague = (item) => {
  triggerConfirmModal(
    '刪除聯賽',
    `確定要刪除聯賽「${item.title}」嗎？`,
    () => {
      leagueList.value = leagueList.value.filter(l => l.id !== item.id)
    }
  )
}

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user) {
    username.value = user.username
  } else {
    router.push('/login')
  }
})
</script>

<style scoped>
.league-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.light-theme { background-color: #f4f6f9; color: #2c3e50; }
.dark-theme { background-color: #121824; color: #e2e8f0; }

.league-main { flex: 1; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; }

/* 頂部工具列 */
.league-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.page-title { margin: 0; font-size: 18px; font-weight: bold; color: #1e293b; }

.header-right-tools { display: flex; align-items: center; gap: 12px; }
.guide-text { font-size: 12px; color: #64748b; cursor: pointer; }
.icon-btn-setting { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 10px; font-size: 12px; cursor: pointer; color: #475569; display: flex; align-items: center; gap: 4px; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-primary.btn-red { background: #ef4444; }

/* 篩選卡片 */
.filter-card { background: #ffffff; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.filter-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.filter-input-text { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; width: 120px; }

/* 下拉選單 */
.custom-select-wrapper { position: relative; width: 140px; }
.custom-select-input { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; min-height: 20px; }
.placeholder-text { color: #94a3b8; }
.select-arrow { font-size: 16px; color: #94a3b8; transition: transform 0.2s; }
.select-arrow.rotate { transform: rotate(180deg); }

.custom-select-dropdown { position: absolute; top: 100%; left: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 200px; overflow-y: auto; z-index: 120; padding: 4px 0; }
.dropdown-group-label { padding: 6px 12px; font-size: 11px; color: #94a3b8; font-weight: bold; background: #f8fafc; }
.dropdown-item { padding: 8px 12px; font-size: 13px; cursor: pointer; color: #334155; }
.dropdown-item:hover { background: #f1f5f9; }
.dropdown-item.selected { color: #2563eb; font-weight: bold; background: #eff6ff; }

.btn-query { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; color: #334155; }

/* 表格與點擊欄位 */
.table-container { background: #ffffff; border-radius: 8px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

.clickable-cell { cursor: pointer; display: inline-block; padding: 2px 4px; border-radius: 4px; transition: background 0.15s; }
.clickable-cell:hover { background: #f1f5f9; }

/* 上下垂直呈現對陣與結果 */
.opponents-flex-vertical, .results-flex-vertical { display: flex; flex-direction: column; gap: 6px; align-items: flex-start; }
.vertical-row { display: flex; align-items: center; gap: 6px; }
.match-tag-label { font-size: 11px; color: #64748b; font-weight: bold; }

.opponent-pill { font-size: 12px; color: #334155; font-weight: 500; }
.opponent-pill.unset { color: #94a3b8; border: 1px dashed #cbd5e1; padding: 1px 6px; border-radius: 4px; }

/* 比賽結果勝負標籤 */
.res-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; color: white; display: inline-block; }
.res-badge.win { background: #3b82f6; }
.res-badge.lose { background: #ef4444; }
.res-badge.unset { background: #f1f5f9; color: #94a3b8; border: 1px dashed #cbd5e1; font-weight: normal; }

.text-green { color: #16a34a; font-weight: 500; }
.text-gray { color: #64748b; }
.font-bold { font-weight: bold; }

.btn-pill-blue { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-pill-gray { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }

/* Modal 彈窗 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.small-card { width: 400px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }

.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row label { width: 80px; font-weight: bold; }
.form-row input[type="text"] { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.flex-1 { flex: 1; }

.result-match-block { display: flex; flex-direction: column; gap: 8px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
.match-title-label { font-weight: bold; font-size: 13px; color: #1e293b; }
.radio-options-row { display: flex; align-items: center; gap: 20px; }
.radio-item { display: flex; align-items: center; gap: 6px; font-size: 13px; cursor: pointer; }

/* 置中刪除確認 Modal */
.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.margin-t { margin-top: 10px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 40px; }
</style>