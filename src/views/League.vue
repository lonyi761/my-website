<template>
  <div :class="['league-layout', isDarkMode ? 'dark-theme' : 'light-theme']" @click="closeAllDropdowns">
    <!-- 全局頂部導航列 -->
    <Navbar 
      activeNav="league" 
      :isDarkMode="isDarkMode" 
      :username="username" 
      @toggle-theme="isDarkMode = !isDarkMode" 
    />

    <!-- 主要內容區 -->
    <div class="league-main">

      <!-- ================= 1. 聯賽列表視圖 ================= -->
      <div v-if="currentView === 'list'">
        <!-- 頂部工具列 -->
        <div class="league-header-bar">
          <h2 class="page-title">聯賽列表</h2>

          <div class="header-right-tools">
            <span class="guide-text">查看引導</span>
            <button class="icon-btn-setting" title="頁面設置">
              <i class="mdi mdi-cog-outline"></i> 頁面設置
            </button>
            <button class="btn-primary" @click="openCreateView()">+ 創建聯賽</button>
          </div>
        </div>

        <!-- 篩選卡片 -->
        <div class="filter-card">
          <div class="filter-row">
            <!-- 標題搜尋 -->
            <input 
              type="text" 
              v-model="filterTitle" 
              placeholder="標題" 
              class="filter-input-text" 
            />

            <!-- 成員分組 -->
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

            <!-- 聯賽類型 -->
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

            <!-- 參與者 -->
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

            <!-- 排序 -->
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

            <button class="btn-query" @click="handleSearch">查詢</button>
          </div>
        </div>

        <!-- 表格列表 -->
        <div class="table-container margin-t">
          <table class="data-table">
            <thead>
              <tr>
                <th>聯賽標題</th>
                <th width="110">聯賽類型</th>
                <th width="140">參與者</th>
                <th width="150">開始時間</th>
                <th width="60">場次</th>
                <th>對陣幫會</th>
                <th>比賽結果</th>
                <th>備註</th>
                <th width="170">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredLeagueList" :key="item.id">
                <td class="font-bold">{{ item.title }}</td>
                <td><span class="text-green">{{ item.type }}</span></td>
                <td>{{ item.participant }}</td>
                <td class="text-gray">{{ item.startTime }}</td>
                <td>{{ item.matchCount }}</td>

                <!-- 對陣幫會 -->
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

                <!-- 比賽結果 -->
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

                <!-- 操作欄位修訂：編輯與刪除改為上下排列 -->
                <td>
                  <div class="action-cell-container">
                    <div class="action-pill-buttons">
                      <button class="btn-pill-blue" @click="openRoster(item)">排表</button>
                      <button class="btn-pill-gray">數據</button>
                    </div>
                    <div class="action-link-stacked">
                      <button class="btn-link" @click="openEditView(item)">編輯</button>
                      <button class="btn-link text-red" @click="confirmDeleteLeague(item)">刪除</button>
                    </div>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredLeagueList.length === 0">
                <td colspan="9" class="empty-cell">暫無聯賽資料</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ================= 2. 新建 / 編輯聯賽視圖 ================= -->
      <div v-else-if="currentView === 'form'" class="create-league-container">
        <div class="create-header-bar">
          <div class="back-title-group">
            <button class="btn-back" @click="currentView = 'list'">&lt; 返回聯賽列表</button>
            <h2 class="page-title">{{ editingLeagueId ? '編輯聯賽' : '新建聯賽' }}</h2>
          </div>
          <div class="create-top-right">
            <span class="guide-text">查看引導</span>
            <button class="btn-secondary margin-l" @click="showCopyModal = true">
              <i class="mdi mdi-content-copy"></i> 複製已有
            </button>
          </div>
        </div>

        <div class="sub-notice-text">
          填寫比賽信息後即可保存。也可以從右上角複製已有場次。
        </div>

        <div class="form-cards-wrapper margin-t">
          <!-- 卡片 1: 比賽信息 -->
          <div class="form-card-block">
            <h3 class="card-block-title">比賽信息</h3>

            <div class="form-row margin-t">
              <label><span class="req">*</span>聯賽類型：</label>
              <div class="type-btn-group">
                <button 
                  :class="['type-btn', { active: leagueForm.type === '幫會聯賽' }]" 
                  @click="leagueForm.type = '幫會聯賽'"
                >
                  幫會聯賽
                </button>
                <button 
                  :class="['type-btn', { active: leagueForm.type === '俱樂部比賽' }]" 
                  @click="leagueForm.type = '俱樂部比賽'"
                >
                  俱樂部比賽
                </button>
              </div>
            </div>

            <div class="form-row margin-t">
              <label><span class="req">*</span>聯賽名稱：</label>
              <div class="input-with-counter flex-1">
                <input 
                  type="text" 
                  v-model="leagueForm.title" 
                  maxlength="20" 
                  placeholder="請輸入聯賽名稱" 
                  class="counter-input"
                />
                <span class="input-char-counter">{{ leagueForm.title.length }} / 20</span>
              </div>
            </div>

            <!-- 開始時間與場次 (修訂：僅保留 20:00 與 20:30 兩種時間) -->
            <div class="form-row margin-t">
              <label><span class="req">*</span>開始時間：</label>
              <div class="time-picker-group">
                <!-- 日期選擇器 -->
                <div class="date-picker-wrapper" @click.stop>
                  <div class="picker-input-box" @click="toggleDatePicker">
                    <i class="mdi mdi-calendar-range icon-gray"></i>
                    <span>{{ leagueForm.date || '選擇日期' }}</span>
                  </div>

                  <!-- 視覺化月曆彈窗 -->
                  <div v-if="showDatePicker" class="calendar-popover-panel">
                    <div class="calendar-head">
                      <span class="cal-nav-btn" @click="changeMonth(-1)">&lt;</span>
                      <span class="cal-title">{{ calYear }} 年 {{ calMonth + 1 }} 月</span>
                      <span class="cal-nav-btn" @click="changeMonth(1)">&gt;</span>
                    </div>
                    <div class="calendar-week-row">
                      <span v-for="w in ['日','一','二','三','四','五','六']" :key="w">{{ w }}</span>
                    </div>
                    <div class="calendar-days-grid">
                      <span 
                        v-for="d in calendarDays" 
                        :key="d.dateStr" 
                        :class="['day-cell', { 'other-month': !d.isCurrentMonth, selected: leagueForm.date === d.dateStr }]"
                        @click="selectDate(d.dateStr)"
                      >
                        {{ d.dayNum }}
                      </span>
                    </div>
                  </div>
                </div>

                <!-- 時刻選擇器 (限定 20:00 與 20:30) -->
                <div class="time-select-wrapper" @click.stop>
                  <div class="picker-input-box" @click="showTimePicker = !showTimePicker">
                    <span>{{ leagueForm.time }}</span>
                    <i :class="['mdi', 'mdi-chevron-down', 'icon-gray', { rotate: showTimePicker }]"></i>
                  </div>
                  <div v-if="showTimePicker" class="time-dropdown-panel">
                    <div 
                      v-for="t in ['20:00', '20:30']" 
                      :key="t" 
                      :class="['time-item', { selected: leagueForm.time === t }]"
                      @click="selectTime(t)"
                    >
                      {{ t }}
                    </div>
                  </div>
                </div>

                <!-- 場次數 (上限 2) -->
                <div class="match-count-group margin-l">
                  <span class="label-inline">場次數：</span>
                  <div class="count-btn-group">
                    <button :class="['count-btn', { active: leagueForm.matchCount === 1 }]" @click="leagueForm.matchCount = 1">1</button>
                    <button :class="['count-btn', { active: leagueForm.matchCount === 2 }]" @click="leagueForm.matchCount = 2">2</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-row margin-t">
              <label><span class="req">*</span>參與者：</label>
              <select v-model="leagueForm.participant" class="flex-1 select-field">
                <option v-for="g in guildOptions" :key="g" :value="g">{{ g }}</option>
                <option v-for="o in otherGroupOptions" :key="o" :value="o">{{ o }}</option>
              </select>
            </div>

            <div class="form-row margin-t">
              <label>備註：</label>
              <input type="text" v-model="leagueForm.notes" placeholder="選填" class="flex-1 input-field" />
            </div>
          </div>

          <!-- 卡片 2: 報名與排表 -->
          <div class="form-card-block margin-t">
            <h3 class="card-block-title">報名與排表</h3>

            <div class="form-row margin-t">
              <label>排表展示：</label>
              <div class="roster-display-setting flex-1">
                <span class="display-value-text">{{ rosterDisplaySummary }}</span>
                <button class="btn-link margin-l" @click="showRosterDisplayModal = true">設置</button>
              </div>
            </div>
          </div>

          <!-- 底部保存預設與提交列 -->
          <div class="form-bottom-actions margin-t">
            <label class="checkbox-label">
              <input type="checkbox" v-model="saveAsDefault" />
              <span>保存為創建幫會聯賽的默認配置</span>
            </label>

            <button class="btn-primary btn-large" @click="saveLeagueForm">保存</button>
          </div>
        </div>
      </div>

    </div>

    <!-- ================= 彈窗組件 ================= -->

    <!-- 1. 複製已有聯賽 Modal (修訂：時間選單限定 20:00 與 20:30) -->
    <div v-if="showCopyModal" class="modal-overlay" @click.self="showCopyModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>複製已有聯賽</h3>
          <span class="close-btn" @click="showCopyModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <p class="sub-hint-text">選一場已有聯賽，改好日期後創建。預設帶上場次配置與語音設定。</p>

          <div class="form-row margin-t">
            <label><span class="req">*</span>源聯賽：</label>
            <select v-model="copySourceId" class="flex-1 select-field">
              <option value="">選擇要複製的聯賽</option>
              <option v-for="item in sortedLeagueListForCopy" :key="item.id" :value="item.id">
                {{ item.title }} ({{ item.startTime }})
              </option>
            </select>
          </div>

          <div class="form-row margin-t">
            <label><span class="req">*</span>新日期：</label>
            <input type="date" v-model="copyNewDate" class="flex-1 input-field" />
            <select v-model="copyNewTime" class="margin-l select-field w-110">
              <option value="20:00">20:00</option>
              <option value="20:30">20:30</option>
            </select>
          </div>

          <div class="form-row margin-t">
            <label>聯賽名字：</label>
            <input type="text" v-model="copyNewTitle" placeholder="自動取源聯賽名，也可手動修改" class="flex-1 input-field" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showCopyModal = false">取消</button>
          <button class="btn-primary" @click="executeCopyLeague">複製並創建</button>
        </div>
      </div>
    </div>

    <!-- 2. 排表展示 Modal -->
    <div v-if="showRosterDisplayModal" class="modal-overlay" @click.self="showRosterDisplayModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>排表展示</h3>
          <span class="close-btn" @click="showRosterDisplayModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="roster-setting-block">
            <div class="setting-title">誰能看排表：</div>
            <div class="pill-options-group">
              <button 
                v-for="opt in ['不可見', '僅自己', '僅本團', '全部團隊']" 
                :key="opt" 
                :class="['pill-opt-btn', { active: rosterConfig.visibility === opt }]"
                @click="rosterConfig.visibility = opt"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <div class="roster-setting-block margin-t">
            <div class="setting-title">卡片上顯示：</div>
            <div class="badge-toggle-group">
              <button 
                v-for="b in ['職能', '職能標籤', '橙武', '一線牽', '錄屏']" 
                :key="b" 
                :class="['badge-toggle-btn', { active: rosterConfig.cardBadges.includes(b) }]"
                @click="toggleRosterBadge(b)"
              >
                {{ b }}
              </button>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="showRosterDisplayModal = false">確定</button>
        </div>
      </div>
    </div>

    <!-- 3. 編輯對陣幫會 Modal -->
    <div v-if="showOpponentModal" class="modal-overlay" @click.self="showOpponentModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>編輯對陣幫會</h3>
          <span class="close-btn" @click="showOpponentModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>第 1 場：</label>
            <input type="text" v-model="tempOpponents[0]" placeholder="請輸入對陣幫會名稱" class="flex-1 input-field" />
          </div>
          <div v-if="activeLeagueItem?.matchCount === 2" class="form-row margin-t">
            <label>第 2 場：</label>
            <input type="text" v-model="tempOpponents[1]" placeholder="請輸入對陣幫會名稱" class="flex-1 input-field" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showOpponentModal = false">取消</button>
          <button class="btn-primary" @click="saveOpponents">保存</button>
        </div>
      </div>
    </div>

    <!-- 4. 編輯比賽結果 Modal -->
    <div v-if="showResultModal" class="modal-overlay" @click.self="showResultModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>比賽結果</h3>
          <span class="close-btn" @click="showResultModal = false">&times;</span>
        </div>
        <div class="modal-body">
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

    <!-- 5. 置中刪除確認 Modal -->
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

const currentView = ref('list')
const editingLeagueId = ref(null)

// 篩選與選項
const filterTitle = ref('')
const filterGroup = ref('')
const filterType = ref('')
const filterParticipant = ref('')
const filterSort = ref('created_desc')
const activeDropdown = ref(null)

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

// 聯賽清單預設資料
const leagueList = ref([
  {
    id: 1,
    title: '幫會聯賽',
    type: '幫會聯賽',
    participant: '百錵谷酒池肉林',
    guild: '百錵谷酒池肉林',
    startTime: '2026-10-10 20:00',
    date: '2026-10-10',
    time: '20:00',
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
    date: '2026-10-17',
    time: '20:00',
    matchCount: 1,
    opponents: ['未填選'],
    results: ['win'],
    notes: ''
  }
])

const filteredLeagueList = computed(() => {
  return leagueList.value.filter(item => {
    const matchTitle = !filterTitle.value || item.title.includes(filterTitle.value) || item.guild.includes(filterTitle.value)
    const matchGroup = !filterGroup.value || item.guild === filterGroup.value
    const matchType = !filterType.value || item.type === filterType.value
    const matchPart = !filterParticipant.value || item.participant === filterParticipant.value
    return matchTitle && matchGroup && matchType && matchPart
  })
})

// 新建/編輯表單狀態
const leagueForm = ref({
  type: '幫會聯賽',
  title: '',
  date: '2026-10-10',
  time: '20:00',
  matchCount: 2,
  participant: '百錵谷酒池肉林',
  notes: ''
})

const saveAsDefault = ref(false)

// 月曆視覺化元件狀態
const showDatePicker = ref(false)
const calYear = ref(2026)
const calMonth = ref(9)

const toggleDatePicker = () => {
  showDatePicker.value = !showDatePicker.value
}

const changeMonth = (delta) => {
  let m = calMonth.value + delta
  if (m > 11) { calMonth.value = 0; calYear.value++ }
  else if (m < 0) { calMonth.value = 11; calYear.value-- }
  else { calMonth.value = m }
}

const calendarDays = computed(() => {
  const days = []
  const firstDay = new Date(calYear.value, calMonth.value, 1).getDay()
  const totalDays = new Date(calYear.value, calMonth.value + 1, 0).getDate()
  const prevMonthTotal = new Date(calYear.value, calMonth.value, 0).getDate()

  for (let i = firstDay - 1; i >= 0; i--) {
    days.push({ dayNum: prevMonthTotal - i, isCurrentMonth: false, dateStr: '' })
  }
  for (let i = 1; i <= totalDays; i++) {
    const mStr = String(calMonth.value + 1).padStart(2, '0')
    const dStr = String(i).padStart(2, '0')
    days.push({ dayNum: i, isCurrentMonth: true, dateStr: `${calYear.value}-${mStr}-${dStr}` })
  }
  return days
})

const selectDate = (dateStr) => {
  if (dateStr) {
    leagueForm.value.date = dateStr
    showDatePicker.value = false
  }
}

// 時間下拉狀態 (修訂：僅提供 20:00 與 20:30)
const showTimePicker = ref(false)
const selectTime = (t) => {
  leagueForm.value.time = t
  showTimePicker.value = false
}

// 排表展示 Modal
const showRosterDisplayModal = ref(false)
const rosterConfig = ref({
  visibility: '全部團隊',
  cardBadges: ['職能', '職能標籤', '橙武', '一線牽', '錄屏']
})

const toggleRosterBadge = (badgeName) => {
  const idx = rosterConfig.value.cardBadges.indexOf(badgeName)
  if (idx > -1) rosterConfig.value.cardBadges.splice(idx, 1)
  else rosterConfig.value.cardBadges.push(badgeName)
}

const rosterDisplaySummary = computed(() => {
  return `${rosterConfig.value.visibility} · ${rosterConfig.value.cardBadges.join('、')}`
})

// 複製已有 Modal
const showCopyModal = ref(false)
const copySourceId = ref('')
const copyNewDate = ref('2026-10-24')
const copyNewTime = ref('20:00') // 修訂：預設 20:00
const copyNewTitle = ref('')

const sortedLeagueListForCopy = computed(() => {
  return [...leagueList.value].sort((a, b) => b.id - a.id)
})

const executeCopyLeague = () => {
  const source = leagueList.value.find(l => l.id === copySourceId.value)
  if (!source) return alert('請選擇要複製的源聯賽！')

  const title = copyNewTitle.value.trim() || source.title
  leagueList.value.unshift({
    id: Date.now(),
    title,
    type: source.type,
    participant: source.participant,
    guild: source.guild,
    startTime: `${copyNewDate.value} ${copyNewTime.value}`,
    date: copyNewDate.value,
    time: copyNewTime.value,
    matchCount: source.matchCount,
    opponents: [...source.opponents],
    results: ['unset', 'unset'],
    notes: source.notes
  })
  showCopyModal.value = false
  currentView.value = 'list'
}

// 視圖控制
const openCreateView = () => {
  editingLeagueId.value = null
  leagueForm.value = {
    type: '幫會聯賽',
    title: '',
    date: '2026-10-24',
    time: '20:00',
    matchCount: 2,
    participant: '百錵谷酒池肉林',
    notes: ''
  }
  currentView.value = 'form'
}

const openEditView = (item) => {
  editingLeagueId.value = item.id
  leagueForm.value = {
    type: item.type,
    title: item.title,
    date: item.date || '2026-10-10',
    time: item.time || '20:00',
    matchCount: item.matchCount,
    participant: item.participant,
    notes: item.notes || ''
  }
  currentView.value = 'form'
}

const saveLeagueForm = () => {
  if (!leagueForm.value.title.trim()) return alert('請輸入聯賽名稱！')

  const startTimeStr = `${leagueForm.value.date} ${leagueForm.value.time}`

  if (editingLeagueId.value) {
    const idx = leagueList.value.findIndex(l => l.id === editingLeagueId.value)
    if (idx > -1) {
      leagueList.value[idx] = {
        ...leagueList.value[idx],
        ...leagueForm.value,
        startTime: startTimeStr,
        guild: leagueForm.value.participant
      }
    }
  } else {
    leagueList.value.unshift({
      id: Date.now(),
      ...leagueForm.value,
      guild: leagueForm.value.participant,
      startTime: startTimeStr,
      opponents: Array(leagueForm.value.matchCount).fill('未填選'),
      results: Array(leagueForm.value.matchCount).fill('unset')
    })
  }
  currentView.value = 'list'
}

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

const confirmDeleteLeague = (item) => {
  triggerConfirmModal(
    '刪除聯賽',
    `確定要刪除聯賽「${item.title}」嗎？`,
    () => {
      leagueList.value = leagueList.value.filter(l => l.id !== item.id)
    }
  )
}

const toggleDropdown = (dropdownName) => {
  activeDropdown.value = activeDropdown.value === dropdownName ? null : dropdownName
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
  showDatePicker.value = false
  showTimePicker.value = false
}

const openRoster = (item) => {
  alert(`開啟聯賽【${item.title}】的排表頁面`)
}

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user) username.value = user.username
  else router.push('/login')
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
.btn-primary.btn-large { padding: 8px 24px; font-size: 14px; }
.btn-primary.btn-red { background: #ef4444; }
.btn-secondary { background: #ffffff; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }

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

/* 表格欄位 */
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

.res-badge { padding: 3px 10px; border-radius: 12px; font-size: 11px; font-weight: bold; color: white; display: inline-block; }
.res-badge.win { background: #3b82f6; }
.res-badge.lose { background: #ef4444; }
.res-badge.unset { background: #f1f5f9; color: #94a3b8; border: 1px dashed #cbd5e1; font-weight: normal; }

.text-green { color: #16a34a; font-weight: 500; }
.text-gray { color: #64748b; }
.font-bold { font-weight: bold; }

/* 操作欄位修訂：編輯與刪除改為上下排列 (圖四對應) */
.action-cell-container { display: flex; align-items: center; gap: 12px; }
.action-pill-buttons { display: flex; gap: 6px; }
.action-link-stacked { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; }

.btn-pill-blue { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-pill-gray { background: #f1f5f9; color: #64748b; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; padding: 0; }
.text-red { color: #ef4444; }

/* 新建/編輯聯賽表單頁面 */
.create-league-container { background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.create-header-bar { display: flex; justify-content: space-between; align-items: center; }
.back-title-group { display: flex; align-items: center; gap: 15px; }
.btn-back { background: none; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #475569; }
.sub-notice-text { font-size: 12px; color: #94a3b8; margin-top: 6px; }

.form-card-block { border: 1px solid #e2e8f0; border-radius: 8px; padding: 18px; background: #ffffff; }
.card-block-title { margin: 0 0 12px 0; font-size: 15px; color: #1e293b; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }

.type-btn-group { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; width: fit-content; }
.type-btn { padding: 6px 16px; border: none; background: #ffffff; font-size: 12px; cursor: pointer; color: #475569; transition: all 0.2s; }
.type-btn.active { background: #5b7db1; color: white; font-weight: bold; }

.input-with-counter { position: relative; display: flex; align-items: center; }
.counter-input { width: 100%; padding: 6px 60px 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; }
.input-char-counter { position: absolute; right: 10px; font-size: 11px; color: #94a3b8; pointer-events: none; }

.time-picker-group { display: flex; align-items: center; gap: 12px; }
.picker-input-box { display: flex; align-items: center; gap: 8px; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; }
.icon-gray { color: #94a3b8; font-size: 16px; }

.date-picker-wrapper, .time-select-wrapper { position: relative; }
.calendar-popover-panel { position: absolute; top: 100%; left: 0; margin-top: 6px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 12px; z-index: 130; width: 250px; }
.calendar-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: bold; font-size: 13px; }
.cal-nav-btn { cursor: pointer; color: #64748b; padding: 0 6px; }
.calendar-week-row { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; color: #94a3b8; margin-bottom: 6px; }
.calendar-days-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px; text-align: center; font-size: 12px; }
.day-cell { padding: 6px 0; border-radius: 4px; cursor: pointer; }
.day-cell:hover { background: #f1f5f9; }
.day-cell.selected { background: #3b82f6; color: white; font-weight: bold; }
.day-cell.other-month { opacity: 0.3; }

.time-dropdown-panel { position: absolute; top: 100%; left: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 130; padding: 4px 0; }
.time-item { padding: 8px 12px; font-size: 13px; cursor: pointer; text-align: center; }
.time-item:hover { background: #f1f5f9; }
.time-item.selected { background: #eff6ff; color: #2563eb; font-weight: bold; }

.match-count-group { display: flex; align-items: center; }
.label-inline { font-size: 13px; font-weight: bold; }
.count-btn-group { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
.count-btn { padding: 4px 12px; border: none; background: white; font-size: 12px; cursor: pointer; }
.count-btn.active { background: #5b7db1; color: white; font-weight: bold; }

.select-field, .input-field { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.w-110 { width: 110px; }

.form-bottom-actions { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 15px; }
.checkbox-label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #475569; cursor: pointer; }

/* Modal 彈窗與卡片配置 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.small-card { width: 400px; }
.medium-card { width: 480px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }

.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row label { width: 90px; font-weight: bold; }
.flex-1 { flex: 1; }
.req { color: #ef4444; }

.roster-setting-block { display: flex; flex-direction: column; gap: 8px; }
.setting-title { font-weight: bold; font-size: 13px; color: #1e293b; }
.pill-options-group { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; width: fit-content; }
.pill-opt-btn { padding: 6px 14px; border: none; background: white; font-size: 12px; cursor: pointer; color: #475569; }
.pill-opt-btn.active { background: #5b7db1; color: white; font-weight: bold; }

.badge-toggle-group { display: flex; flex-wrap: wrap; gap: 8px; }
.badge-toggle-btn { border: 1px solid #cbd5e1; background: white; padding: 4px 12px; border-radius: 16px; font-size: 12px; cursor: pointer; color: #475569; }
.badge-toggle-btn.active { border-color: #3b82f6; background: #eff6ff; color: #2563eb; font-weight: bold; }

/* 置中刪除確認 Modal */
.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

.sub-hint-text { font-size: 12px; color: #94a3b8; line-height: 1.4; }
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.margin-t { margin-top: 12px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 40px; }
</style>