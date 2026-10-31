<template>
  <div class="share-layout">
    <header class="share-bar">
      <span class="share-brand">逆水寒團隊系統 · 戰績分享</span>
      <div class="share-actions">
        <button class="btn-icon" :title="theme === 'dark' ? '切換為亮色' : '切換為夜晚版'" @click="toggleTheme">
          <i :class="['mdi', theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night']"></i>
        </button>
        <router-link to="/quick-stats" class="btn-primary"><i class="mdi mdi-upload"></i> 我也要分析戰績</router-link>
      </div>
    </header>

    <main class="share-main">
      <div v-if="state === 'loading'" class="state-card">讀取中...</div>
      <div v-else-if="state === 'missing'" class="state-card">
        <i class="mdi mdi-link-variant-off state-icon"></i>
        <h2>找不到這份戰績</h2>
        <p>連結可能打錯，或分享者已經取消分享。</p>
        <router-link to="/quick-stats" class="btn-primary">自己上傳戰績分析</router-link>
      </div>
      <template v-else>
        <div class="share-note">
          <span><i class="mdi mdi-share-variant"></i> 這是別人分享的戰績（{{ formatDate(report.created_at) }} 分享）。</span>
          <button class="btn-tool" @click="saveToMine"><i class="mdi mdi-content-save-outline"></i> 存到我的快速分析</button>
        </div>
        <MatchReport
          :record="report"
          :result="report.result"
          :subtitle="report.file_name"
          :file-label="report.my_name + '_vs_' + report.opp_name"
        />
      </template>
    </main>
  </div>
</template>

<script setup>
// 分享連結頁：不用登入，透過 get_shared_report 依連結上的 id 讀取一場戰績
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../utils/supabase'
import { notify } from '../utils/notify'
import { theme, toggleTheme } from '../utils/theme'
import { loadQuickRecords, saveQuickRecords, recordFingerprint, newRecordId, sortRecords } from '../utils/quickStatsStore'
import MatchReport from './league/stats/MatchReport.vue'

const route = useRoute()
const router = useRouter()
const state = ref('loading')
const report = ref(null)

const formatDate = (value) => {
  const d = new Date(value)
  return isNaN(d) ? '' : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 存一份到這台電腦的快速分析紀錄（之後可自己交換我方、填勝負）
const saveToMine = () => {
  const r = report.value
  const list = loadQuickRecords()
  const record = {
    id: newRecordId(), file_name: r.file_name, played_at: r.played_at,
    my_name: r.my_name, opp_name: r.opp_name, my_players: r.my_players, opp_players: r.opp_players,
    result: r.result || '', share_id: null, share_stale: false, added_at: new Date().toISOString()
  }
  if (!list.some(x => recordFingerprint(x) === recordFingerprint(record))) {
    const error = saveQuickRecords(sortRecords([record, ...list]))
    if (error) return notify(error)
  }
  router.push('/quick-stats')
}

onMounted(async () => {
  const id = String(route.params.id || '')
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    state.value = 'missing'
    return
  }
  const { data, error } = await supabase.rpc('get_shared_report', { rid: id })
  const row = Array.isArray(data) ? data[0] : data
  if (error || !row) {
    state.value = 'missing'
    return
  }
  report.value = row
  state.value = 'ready'
  document.title = `${row.my_name} vs ${row.opp_name} · 逆水寒戰績分享`
})
</script>

<style scoped>
.share-layout { min-height: 100vh; display: flex; flex-direction: column; background: var(--c-page); font-family: var(--font-sans); }
.share-bar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: var(--c-surface); border-bottom: 1px solid var(--c-border); gap: 10px; }
.share-brand { font-weight: bold; color: var(--c-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.share-actions { display: flex; gap: 10px; align-items: center; }
.btn-icon { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--c-border-strong); background: var(--c-surface); color: var(--c-text-3); cursor: pointer; font-size: 17px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.btn-primary { background: #3b82f6; color: #ffffff; text-decoration: none; padding: 7px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; display: inline-flex; align-items: center; gap: 4px; white-space: nowrap; }
.btn-tool { border: 1px solid var(--c-border-strong); background: var(--c-surface); color: var(--c-text-2); border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
.share-main { flex: 1; padding: 16px 20px; max-width: 1400px; width: 100%; margin: 0 auto; box-sizing: border-box; display: flex; flex-direction: column; gap: 12px; }
.share-note { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 13px; color: var(--c-text-3); background: var(--c-surface); border-radius: 10px; padding: 10px 14px; }
.state-card { background: var(--c-surface); border-radius: 12px; padding: 48px 24px; text-align: center; color: var(--c-text-3); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.state-card h2 { margin: 0; color: var(--c-text); }
.state-icon { font-size: 44px; color: var(--c-faint); }

@media (max-width: 640px) {
  .share-bar { padding: 0 12px; }
  .share-main { padding: 12px; }
}
</style>
