<template>
  <div :class="['league-layout', isDarkMode ? 'dark-theme' : 'light-theme']" @click="closeAllDropdowns">
    <Navbar 
      activeNav="league" 
      :isDarkMode="isDarkMode" 
      :username="username" 
      @toggle-theme="isDarkMode = !isDarkMode" 
    />

    <div class="league-main">

      <!-- 1. 聯賽列表視圖 -->
      <div v-if="currentView === 'list'">
        <div class="league-header-bar">
          <h2 class="page-title">聯賽列表</h2>
          <div class="header-right-tools">
            <button class="btn-primary" @click="openCreateView()">+ 創建聯賽</button>
          </div>
        </div>

        <!-- 篩選卡片 -->
        <div class="filter-card">
          <div class="filter-row">
            <input type="text" v-model="filterTitle" placeholder="搜尋標題..." class="filter-input-text" />
            <button class="btn-query" @click="fetchLeaguesFromDB">查詢</button>
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
                <th width="170">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in filteredLeagueList" :key="item.id">
                <td class="font-bold">{{ item.title }}</td>
                <td><span class="text-green">{{ item.type }}</span></td>
                <td>{{ item.participant }}</td>
                <td class="text-gray">{{ item.startTime }}</td>

                <td>
                  <div class="action-cell-container">
                    <button class="btn-pill-blue" @click="openRosterBoard(item)">排表</button>
                    <button class="btn-link text-red margin-l" @click="confirmDeleteLeague(item)">刪除</button>
                  </div>
                </td>
              </tr>
              <tr v-if="filteredLeagueList.length === 0">
                <td colspan="5" class="empty-cell">暫無聯賽資料，點擊右上角「+ 創建聯賽」新增</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 2. 新建聯賽視圖 -->
      <div v-else-if="currentView === 'form'" class="create-league-container">
        <div class="create-header-bar">
          <button class="btn-back" @click="currentView = 'list'">&lt; 返回聯賽列表</button>
          <h2 class="page-title">新建聯賽</h2>
        </div>

        <div class="form-cards-wrapper margin-t">
          <div class="form-card-block">
            <div class="form-row margin-t">
              <label>聯賽類型：</label>
              <select v-model="leagueForm.type" class="select-field flex-1">
                <option value="幫會聯賽">幫會聯賽</option>
                <option value="俱樂部比賽">俱樂部比賽</option>
              </select>
            </div>

            <div class="form-row margin-t">
              <label>聯賽名稱：</label>
              <input type="text" v-model="leagueForm.title" placeholder="請輸入名稱" class="input-field flex-1" />
            </div>

            <div class="form-row margin-t">
              <label>開始時間：</label>
              <input type="date" v-model="leagueForm.date" class="input-field flex-1" />
              <select v-model="leagueForm.time" class="select-field margin-l">
                <option value="20:00">20:00</option>
                <option value="20:30">20:30</option>
              </select>
            </div>
          </div>

          <div class="form-bottom-actions margin-t">
            <button class="btn-primary btn-large" @click="saveLeagueForm">保存並創建</button>
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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../utils/supabase'
import Navbar from '../components/layout/Navbar.vue'
import RosterBoard from './league/RosterBoard.vue'

const isDarkMode = ref(false)
const username = ref('VIP')
const userProfile = ref(null)

const currentView = ref('list')
const activeLeagueForRoster = ref(null)

const filterTitle = ref('')
const leagueList = ref([])

const leagueForm = ref({
  type: '幫會聯賽',
  title: '幫會聯賽',
  date: '2026-10-10',
  time: '20:00',
  participant: '百錵谷酒池肉林'
})

const fetchLeaguesFromDB = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, guilds(*)')
    .eq('id', session.user.id)
    .single()

  if (profile) {
    userProfile.value = profile
    username.value = session.user.email.split('@')[0]
  }

  // 從 Supabase 撈取聯賽排表
  if (profile?.guild_id) {
    const { data: rostersData } = await supabase
      .from('guild_rosters')
      .select('*')
      .eq('guild_id', profile.guild_id)

    if (rostersData) {
      leagueList.value = rostersData.map(r => ({
        id: r.id,
        title: r.title,
        type: r.type,
        participant: profile.guilds?.name || '百錵谷酒池肉林',
        guild: profile.guilds?.name || '百錵谷酒池肉林',
        startTime: r.start_time,
        matrixTeams: r.matrix_teams
      }))
    }
  }
}

const filteredLeagueList = computed(() => {
  return leagueList.value.filter(item => {
    return !filterTitle.value || item.title.includes(filterTitle.value)
  })
})

const openCreateView = () => {
  currentView.value = 'form'
}

const saveLeagueForm = async () => {
  if (!leagueForm.value.title.trim()) return alert('請輸入名稱！')

  if (userProfile.value?.guild_id) {
    await supabase.from('guild_rosters').insert([{
      guild_id: userProfile.value.guild_id,
      title: leagueForm.value.title,
      type: leagueForm.value.type,
      start_time: `${leagueForm.value.date} ${leagueForm.value.time}`,
      matrix_teams: []
    }])
    await fetchLeaguesFromDB()
  }

  currentView.value = 'list'
}

const openRosterBoard = (item) => {
  activeLeagueForRoster.value = item
  currentView.value = 'roster'
}

const confirmDeleteLeague = async (item) => {
  if (confirm(`確定要刪除「${item.title}」嗎？`)) {
    await supabase.from('guild_rosters').delete().eq('id', item.id)
    await fetchLeaguesFromDB()
  }
}

onMounted(fetchLeaguesFromDB)
</script>

<style scoped>
.league-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.light-theme { background-color: #f4f6f9; color: #2c3e50; }
.league-main { flex: 1; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; }
.league-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.page-title { margin: 0; font-size: 18px; font-weight: bold; color: #1e293b; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.filter-card { background: #ffffff; border-radius: 8px; padding: 12px 16px; }
.filter-row { display: flex; align-items: center; gap: 12px; }
.filter-input-text { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.btn-query { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }

.table-container { background: #ffffff; border-radius: 8px; overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; }
.btn-pill-blue { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }

.create-league-container { background: #ffffff; border-radius: 8px; padding: 20px; }
.create-header-bar { display: flex; align-items: center; gap: 15px; }
.btn-back { background: none; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; }
.form-row { display: flex; align-items: center; font-size: 13px; }
.form-row label { width: 90px; font-weight: bold; }
.input-field, .select-field { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.flex-1 { flex: 1; }
.margin-l { margin-left: 10px; }
.margin-t { margin-top: 12px; }
</style>