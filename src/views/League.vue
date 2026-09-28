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
      <!-- 頂部標題與按鈕工具列 (圖一/圖二對應) -->
      <div class="league-header-bar">
        <h2 class="page-title">聯賽列表</h2>

        <div class="header-right-tools">
          <span class="guide-text">查看引導</span>
          <button class="icon-btn-setting" title="頁面設置">
            <i class="mdi mdi-cog-outline"></i> 頁面設置
          </button>

          <!-- 視圖切換按鈕 (只保留 卡片 與 表格) -->
          <div class="view-mode-toggle">
            <button 
              :class="['mode-btn', { active: viewMode === 'card' }]" 
              @click="viewMode = 'card'"
              title="卡片視圖"
            >
              <i class="mdi mdi-view-grid-outline"></i>
            </button>
            <button 
              :class="['mode-btn', { active: viewMode === 'table' }]" 
              @click="viewMode = 'table'"
              title="表格視圖"
            >
              <i class="mdi mdi-table"></i>
            </button>
          </div>

          <button class="btn-primary" @click="createLeague">+ 創建聯賽</button>
        </div>
      </div>

      <!-- 篩選列 (精簡欄位後) -->
      <div class="filter-card">
        <div class="filter-row">
          <!-- 1. 標題搜尋 -->
          <input 
            type="text" 
            v-model="filterTitle" 
            placeholder="標題" 
            class="filter-input-text" 
          />

          <!-- 2. 成員分組 (圖三對應) -->
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

          <!-- 3. 聯賽類型 (圖四對應) -->
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

          <!-- 4. 排序 (圖五對應) -->
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

          <!-- 5. 查詢按鈕 -->
          <button class="btn-query" @click="handleSearch">查詢</button>
        </div>
      </div>

      <!-- 內容視圖 1: 卡片視圖 (圖一對應) -->
      <div v-if="viewMode === 'card'" class="card-grid-container margin-t">
        <div v-for="item in filteredLeagueList" :key="item.id" class="league-card-item">
          <div class="card-head">
            <div class="card-title-group">
              <span class="card-index">#{{ item.id }}</span>
              <span class="card-title-text">{{ item.title }} ({{ item.guild }})</span>
            </div>
            <div class="card-head-right">
              <span class="status-pill green">報名中</span>
              <label class="switch">
                <input type="checkbox" v-model="item.enabled" />
                <span class="slider"></span>
              </label>
            </div>
          </div>

          <div class="card-body">
            <div class="time-text">{{ item.startTime }} 開始</div>
            <div class="stats-row">
              <span>應到人數: {{ item.shouldAttend }}人</span>
              <span class="margin-l">請假: {{ item.leaveCount }}人</span>
              <span class="margin-l">已簽到: {{ item.signedCount }}人</span>
            </div>
            <div class="note-text">備註：{{ item.notes || '—' }}</div>
          </div>

          <div class="card-footer-actions">
            <span class="tag-badge purple">排表</span>
            <span class="tag-badge gray margin-l">數據</span>
            <span class="tag-badge gray margin-l">考勤</span>
            <span class="tag-badge gray margin-l">報名</span>
            <button class="btn-more-link margin-l">更多 <i class="mdi mdi-chevron-down"></i></button>
          </div>
        </div>

        <div v-if="filteredLeagueList.length === 0" class="empty-card-box">
          暫無聯賽數據
        </div>
      </div>

      <!-- 內容視圖 2: 表格視圖 (圖二對應) -->
      <div v-else-if="viewMode === 'table'" class="table-container margin-t">
        <table class="data-table">
          <thead>
            <tr>
              <th width="50">#</th>
              <th>聯賽標題</th>
              <th>聯賽類型</th>
              <th>開始時間</th>
              <th>報名截止</th>
              <th>場次</th>
              <th>比賽結果</th>
              <th>關聯幫會</th>
              <th>可報名範圍</th>
              <th>約戰形式</th>
              <th>關聯俱樂部</th>
              <th>開放報名</th>
              <th>開放搶表</th>
              <th>備註</th>
              <th width="80">啟用聯賽</th>
              <th width="80">公開約戰</th>
              <th width="150">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in filteredLeagueList" :key="item.id">
              <td>{{ idx + 1 }}</td>
              <td class="font-bold">{{ item.title }}</td>
              <td><span class="text-green">{{ item.type }}</span></td>
              <td>{{ item.startTime }}</td>
              <td>{{ item.deadline || '—' }}</td>
              <td>{{ item.matchCount }}</td>
              <td><span class="result-badge">{{ item.result || '填結果' }}</span></td>
              <td>{{ item.guild }}</td>
              <td>{{ item.signupRange || '—' }}</td>
              <td>{{ item.battleFormat || '—' }}</td>
              <td>{{ item.club || '—' }}</td>
              <td>{{ item.openSignup ? '開放' : '未開放' }}</td>
              <td>{{ item.openClaim ? '開放' : '—' }}</td>
              <td>{{ item.notes }}</td>
              <td>
                <label class="switch">
                  <input type="checkbox" v-model="item.enabled" />
                  <span class="slider"></span>
                </label>
              </td>
              <td>—</td>
              <td>
                <button class="btn-pill-blue">排表</button>
                <button class="btn-pill-gray margin-l">數據</button>
                <button class="btn-link margin-l">更多 <i class="mdi mdi-chevron-down"></i></button>
              </td>
            </tr>
            <tr v-if="filteredLeagueList.length === 0">
              <td colspan="17" class="empty-cell">暫無聯賽資料</td>
            </tr>
          </tbody>
        </table>
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

// 視圖切換 ('card' | 'table') - 只保留這兩個 (圖一 / 圖二)
const viewMode = ref('card')

// 篩選狀態 (已精簡)
const filterTitle = ref('')
const filterGroup = ref('')
const filterType = ref('')
const filterSort = ref('created_desc')

const activeDropdown = ref(null) // 'group' | 'type' | 'sort' | null

// 選項資料
const guildOptions = ['百錵谷酒池肉林', '天下雲五']
const otherGroupOptions = ['遊客']

const typeOptions = ['幫會聯賽', '約戰', '俱樂部聯賽']

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

// 模擬聯賽列表資料
const leagueList = ref([
  {
    id: 1,
    title: '幫會聯賽',
    guild: '天下雲五',
    type: '幫會聯賽',
    startTime: '2026-10-10 20:00',
    deadline: '',
    matchCount: 1,
    result: '填結果',
    signupRange: '',
    battleFormat: '',
    club: '',
    openSignup: false,
    openClaim: false,
    shouldAttend: 0,
    leaveCount: 0,
    signedCount: 2,
    notes: '1',
    enabled: true
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
  if (category === 'sort') filterSort.value = value
  activeDropdown.value = null
}

const closeAllDropdowns = () => {
  activeDropdown.value = null
}

const handleSearch = () => {
  // 觸發重新篩選
}

const filteredLeagueList = computed(() => {
  return leagueList.value.filter(item => {
    const matchTitle = !filterTitle.value || item.title.includes(filterTitle.value) || item.guild.includes(filterTitle.value)
    const matchGroup = !filterGroup.value || item.guild === filterGroup.value
    const matchType = !filterType.value || item.type === filterType.value
    return matchTitle && matchGroup && matchType
  })
})

const createLeague = () => {
  alert('創建聯賽功能開發中...')
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

/* 視圖切換按鈕 */
.view-mode-toggle { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; }
.mode-btn { border: none; background: none; padding: 6px 12px; font-size: 16px; color: #64748b; cursor: pointer; transition: all 0.15s; }
.mode-btn.active { background: #3b82f6; color: white; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }

/* 篩選卡片 */
.filter-card { background: #ffffff; border-radius: 8px; padding: 12px 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.filter-row { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }

.filter-input-text { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; width: 120px; }

/* 下拉選單組件 (對應圖三/圖四/圖五) */
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

/* 卡片視圖 (圖一) */
.card-grid-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }
.league-card-item { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); display: flex; flex-direction: column; gap: 10px; }
.card-head { display: flex; justify-content: space-between; align-items: center; }
.card-title-text { font-weight: bold; font-size: 14px; color: #1e293b; margin-left: 4px; }
.card-index { font-size: 12px; color: #94a3b8; }
.card-head-right { display: flex; align-items: center; gap: 8px; }

.status-pill.green { background: #dcfce7; color: #16a34a; border: 1px solid #bbf7d0; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }

.card-body { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: #64748b; }
.stats-row { font-size: 11px; color: #475569; }
.note-text { color: #94a3b8; font-size: 11px; }

.card-footer-actions { display: flex; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 8px; }
.tag-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.tag-badge.purple { background: #f3e8ff; color: #8b5cf6; border: 1px solid #e9d5ff; }
.tag-badge.gray { background: #f1f5f9; color: #64748b; border: 1px solid #e2e8f0; }
.btn-more-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 11px; }

/* 表格視圖 (圖二) */
.table-container { background: #ffffff; border-radius: 8px; overflow-x: auto; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.data-table { width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; }
.data-table th, .data-table td { padding: 10px 10px; border-bottom: 1px solid #f1f5f9; white-space: nowrap; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

.text-green { color: #16a34a; font-weight: 500; }
.result-badge { border: 1px dashed #cbd5e1; padding: 2px 6px; border-radius: 4px; color: #94a3b8; font-size: 11px; }

.btn-pill-blue { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }
.btn-pill-gray { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 2px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 11px; }

/* Switch 開關 */
.switch { position: relative; display: inline-block; width: 32px; height: 18px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 18px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(14px); }

.margin-l { margin-left: 10px; }
.margin-t { margin-top: 15px; }
.font-bold { font-weight: bold; }
.empty-card-box, .empty-cell { text-align: center; color: #94a3b8; padding: 40px; width: 100%; }
</style>