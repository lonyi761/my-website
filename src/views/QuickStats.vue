<template>
  <div class="quick-layout">
    <Navbar v-if="isLoggedIn" activeNav="quick" :username="username" />
    <header v-else class="guest-bar">
      <span class="guest-brand">逆水寒團隊系統 · 戰績快速分析</span>
      <div class="guest-actions">
        <button class="btn-icon" :title="theme === 'dark' ? '切換為亮色' : '切換為夜晚版'" @click="toggleTheme">
          <i :class="['mdi', theme === 'dark' ? 'mdi-weather-sunny' : 'mdi-weather-night']"></i>
        </button>
        <router-link to="/login" class="btn-login">登入</router-link>
      </div>
    </header>

    <div class="quick-main">
      <!-- 左側：上傳與本機紀錄 -->
      <aside class="quick-side">
        <div
          :class="['drop-zone', { dragging }]"
          @click="fileInput?.click()"
          @dragover.prevent="dragging = true"
          @dragleave.prevent="dragging = false"
          @drop.prevent="onDrop"
        >
          <i class="mdi mdi-file-upload-outline"></i>
          <b>上傳戰績 CSV</b>
          <span>拖曳檔案到這裡，或點一下選擇（可多檔）</span>
        </div>
        <input ref="fileInput" type="file" accept=".csv" multiple class="hidden-input" @change="onFiles($event.target.files); $event.target.value = ''" />
        <p class="side-hint"><i class="mdi mdi-lock-outline"></i> 紀錄只存在這台電腦的瀏覽器，不會上傳；按「分享」才會產生公開連結。</p>

        <div class="history-head">
          <span>我的紀錄（{{ records.length }}）</span>
          <button v-if="records.length" class="btn-text" @click="clearAll">全部清除</button>
        </div>
        <div class="history-list">
          <div
            v-for="r in records"
            :key="r.id"
            :class="['history-item', { active: r.id === selectedId }]"
            @click="selectedId = r.id"
          >
            <div class="hi-top">
              <span :class="['hi-result', r.result || 'pending']">{{ r.result === 'win' ? '勝' : r.result === 'loss' ? '敗' : '—' }}</span>
              <span class="hi-names"><b>{{ r.my_name }}</b> vs {{ r.opp_name }}</span>
              <i v-if="r.share_id" class="mdi mdi-link-variant hi-shared" title="已分享"></i>
              <button class="hi-del" title="刪除這筆紀錄" @click.stop="removeRecord(r)"><i class="mdi mdi-close"></i></button>
            </div>
            <div class="hi-meta">{{ formatDateTime(r.played_at || r.added_at) }} · {{ r.my_players.length }} 對 {{ r.opp_players.length }} 人</div>
          </div>
          <p v-if="!records.length" class="history-empty">還沒有紀錄</p>
        </div>
      </aside>

      <!-- 右側：報告 -->
      <section class="quick-content">
        <div v-if="!selected" class="intro-card">
          <i class="mdi mdi-chart-box-outline intro-icon"></i>
          <h2>戰績快速分析</h2>
          <p>不需要幫會、不需要登入，直接上傳遊戲匯出的戰績 CSV 就能看完整的戰績報告。</p>
          <ol>
            <li>在遊戲內打完幫戰／聯賽後下載戰績（檔案在電腦的 <code>AppData\LocalLow\netease\逆水寒</code>）。</li>
            <li>把 CSV 拖到左邊，或點「上傳戰績 CSV」（可一次選多個檔案）。</li>
            <li>查看雙方對比、各項稱號、職業對比與每位玩家的明細；可導出圖片、CSV，登入後還能產生分享連結。</li>
          </ol>
          <button class="btn-primary" @click="fileInput?.click()"><i class="mdi mdi-upload"></i> 上傳戰績 CSV</button>
        </div>

        <template v-else>
          <!-- 這一場的設定與分享 -->
          <div class="record-bar">
            <div class="rb-left">
              <label>勝負
                <select :value="selected.result" @change="updateSelected({ result: $event.target.value })">
                  <option value="">未填</option>
                  <option value="win">{{ selected.my_name }} 勝</option>
                  <option value="loss">{{ selected.opp_name }} 勝</option>
                </select>
              </label>
              <button class="btn-tool" title="CSV 的第一個幫會預設為我方；不是的話可以交換" @click="swapSides"><i class="mdi mdi-swap-horizontal"></i> 交換我方／對方</button>
            </div>
            <div class="rb-right">
              <template v-if="isLoggedIn">
                <button class="btn-primary" :disabled="isSharing" @click="createShare">
                  <i class="mdi mdi-share-variant"></i> {{ isSharing ? '產生中...' : selected.share_id ? (selected.share_stale ? '更新分享連結' : '重新產生連結') : '分享' }}
                </button>
              </template>
              <span v-else class="share-hint"><i class="mdi mdi-information-outline"></i> <router-link to="/login?redirect=/quick-stats">登入</router-link>後可產生分享連結</span>
            </div>
          </div>
          <div v-if="selected.share_id" class="share-box">
            <i class="mdi mdi-link-variant"></i>
            <input class="share-input" :value="shareUrl(selected.share_id)" readonly @focus="$event.target.select()" />
            <button class="btn-tool" @click="copyShare"><i class="mdi mdi-content-copy"></i> 複製</button>
            <button class="btn-text danger" @click="removeShare">取消分享</button>
            <span v-if="selected.share_stale" class="stale-note">這場在分享後有修改，連結裡仍是舊的內容</span>
          </div>

          <MatchReport
            :key="selected.id + (selected.swapped ? '_s' : '')"
            :record="selected"
            :result="selected.result"
            :subtitle="selected.file_name"
            :file-label="selected.my_name + '_vs_' + selected.opp_name"
          />
        </template>
      </section>
    </div>
  </div>
</template>

<script setup>
// 戰績快速分析：不需登入、不需幫會，CSV 存在本機瀏覽器；登入後可產生公開分享連結
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../utils/supabase'
import { notify } from '../utils/notify'
import { theme, toggleTheme } from '../utils/theme'
import { parseMatchCsv } from '../utils/matchStatsCsv'
import { loadQuickRecords, saveQuickRecords, recordFingerprint, newRecordId, sortRecords } from '../utils/quickStatsStore'
import Navbar from '../components/layout/Navbar.vue'
import MatchReport from './league/stats/MatchReport.vue'

const records = ref(sortRecords(loadQuickRecords()))
const selectedId = ref(records.value[0]?.id || '')
const selected = computed(() => records.value.find(r => r.id === selectedId.value) || null)
const fileInput = ref(null)
const dragging = ref(false)
const isSharing = ref(false)
const isLoggedIn = ref(false)
const username = ref('')

const persist = () => {
  const error = saveQuickRecords(records.value)
  if (error) notify(error)
}

const onDrop = (e) => {
  dragging.value = false
  onFiles(e.dataTransfer?.files)
}

// 解析多個 CSV，加入本機紀錄（重複的檔案略過）
const onFiles = async (fileList) => {
  const files = [...(fileList || [])].filter(f => f.name.toLowerCase().endsWith('.csv'))
  if (!files.length) return notify('請選擇遊戲匯出的戰績 CSV 檔。', 'warning')
  const existing = new Set(records.value.map(recordFingerprint))
  const added = []
  const failed = []
  for (const file of files) {
    try {
      const parsed = parseMatchCsv(await file.text(), file.name)
      const [my, opp] = parsed.sides
      const record = {
        id: newRecordId(),
        file_name: file.name,
        played_at: parsed.playedAt ? parsed.playedAt.toISOString() : null,
        my_name: my.name,
        opp_name: opp.name,
        my_players: my.players,
        opp_players: opp.players,
        result: '',
        share_id: null,
        share_stale: false,
        added_at: new Date().toISOString()
      }
      if (existing.has(recordFingerprint(record))) continue
      existing.add(recordFingerprint(record))
      added.push(record)
    } catch (err) {
      failed.push(`${file.name}（${err.message}）`)
    }
  }
  if (added.length) {
    records.value = sortRecords([...added, ...records.value])
    selectedId.value = added[0].id
    persist()
    notify(`已加入 ${added.length} 場戰績。`, 'success')
  } else if (!failed.length) {
    notify('這些檔案已經在紀錄裡了。', 'warning')
  }
  if (failed.length) notify('無法讀取：' + failed.join('、'))
}

const updateSelected = (patch) => {
  const r = selected.value
  if (!r) return
  Object.assign(r, patch, r.share_id ? { share_stale: true } : {})
  persist()
}

// CSV 第一個區塊是下載者的幫會；若是別人給的檔案，可交換成另一邊為我方
const swapSides = () => {
  const r = selected.value
  if (!r) return
  updateSelected({
    my_name: r.opp_name, opp_name: r.my_name,
    my_players: r.opp_players, opp_players: r.my_players,
    result: r.result === 'win' ? 'loss' : r.result === 'loss' ? 'win' : '',
    swapped: !r.swapped
  })
}

const removeRecord = (r) => {
  if (!confirm(`要刪除「${r.my_name} vs ${r.opp_name}」這筆紀錄嗎？${r.share_id ? '\n（已分享的連結不受影響，可先按「取消分享」）' : ''}`)) return
  records.value = records.value.filter(x => x.id !== r.id)
  if (selectedId.value === r.id) selectedId.value = records.value[0]?.id || ''
  persist()
}

const clearAll = () => {
  if (!confirm('要清除這台電腦上的全部紀錄嗎？（已分享的連結不受影響）')) return
  records.value = []
  selectedId.value = ''
  persist()
}

const shareUrl = (id) => `${location.origin}/share/${id}`

// 產生分享連結；更新時先刪掉舊的那份
const createShare = async () => {
  const r = selected.value
  if (!r || isSharing.value) return
  isSharing.value = true
  try {
    const { data, error } = await supabase.from('shared_reports').insert([{
      file_name: r.file_name,
      played_at: r.played_at,
      my_name: r.my_name,
      opp_name: r.opp_name,
      result: r.result || '',
      my_players: r.my_players,
      opp_players: r.opp_players
    }]).select('id')
    if (error || !data?.[0]) throw new Error(error?.message || '沒有權限建立分享')
    const oldId = r.share_id
    Object.assign(r, { share_id: data[0].id, share_stale: false })
    persist()
    if (oldId) await supabase.from('shared_reports').delete().eq('id', oldId)
    await copyShare()
  } catch (err) {
    notify('產生分享連結失敗：' + err.message)
  } finally {
    isSharing.value = false
  }
}

const copyShare = async () => {
  const r = selected.value
  if (!r?.share_id) return
  try {
    await navigator.clipboard.writeText(shareUrl(r.share_id))
    notify('分享連結已複製，貼給別人就能直接查看（不用登入）。', 'success')
  } catch {
    notify('已產生分享連結，請手動複製下方網址。', 'success')
  }
}

const removeShare = async () => {
  const r = selected.value
  if (!r?.share_id || !confirm('取消分享後，原本的連結就打不開了。確定嗎？')) return
  const { data, error } = await supabase.from('shared_reports').delete().eq('id', r.share_id).select('id')
  if (error) return notify('取消分享失敗：' + error.message)
  if (!data?.length) notify('這個連結不是你建立的，或已經被刪除，已從這台電腦移除。', 'warning')
  Object.assign(r, { share_id: null, share_stale: false })
  persist()
}

const formatDateTime = (value) => {
  const d = new Date(value)
  if (!value || isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// 別的分頁改了紀錄時同步
const onStorage = (e) => { if (e.key === 'quick_stats_history_v1') records.value = sortRecords(loadQuickRecords()) }
watch(records, (list) => { if (selectedId.value && !list.some(r => r.id === selectedId.value)) selectedId.value = list[0]?.id || '' })

onMounted(async () => {
  window.addEventListener('storage', onStorage)
  const { data: { session } } = await supabase.auth.getSession()
  isLoggedIn.value = !!session
  username.value = session?.user?.email?.split('@')[0] || ''
})
</script>

<style scoped>
.quick-layout { min-height: 100vh; display: flex; flex-direction: column; background: var(--c-page); font-family: var(--font-sans); }
.guest-bar { height: 56px; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; background: var(--c-surface); border-bottom: 1px solid var(--c-border); }
.guest-brand { font-weight: bold; color: var(--c-text); }
.guest-actions { display: flex; gap: 10px; align-items: center; }
.btn-icon { width: 32px; height: 32px; border-radius: 50%; border: 1px solid var(--c-border-strong); background: var(--c-surface); color: var(--c-text-3); cursor: pointer; font-size: 17px; display: flex; align-items: center; justify-content: center; }
.btn-login { background: #3b82f6; color: #ffffff; text-decoration: none; padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: bold; }

.quick-main { flex: 1; display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 16px; padding: 16px 20px; max-width: 1500px; width: 100%; margin: 0 auto; box-sizing: border-box; }
.quick-side { display: flex; flex-direction: column; gap: 10px; }
.drop-zone { border: 2px dashed var(--c-border-strong); border-radius: 12px; background: var(--c-surface); padding: 20px 14px; text-align: center; cursor: pointer; display: flex; flex-direction: column; gap: 4px; align-items: center; color: var(--c-text-3); transition: border-color 0.15s, background 0.15s; }
.drop-zone:hover, .drop-zone.dragging { border-color: #3b82f6; background: var(--c-primary-soft); }
.drop-zone .mdi { font-size: 32px; color: #3b82f6; }
.drop-zone b { color: var(--c-text); }
.drop-zone span { font-size: 12px; }
.hidden-input { display: none; }
.side-hint { font-size: 11px; color: var(--c-muted); margin: 0; line-height: 1.6; }
.history-head { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: bold; color: var(--c-text-2); margin-top: 6px; }
.btn-text { background: none; border: none; color: var(--c-muted); font-size: 12px; cursor: pointer; padding: 0; }
.btn-text:hover { color: var(--c-primary-text); }
.btn-text.danger { color: var(--c-danger-text); }
.history-list { display: flex; flex-direction: column; gap: 6px; max-height: calc(100vh - 330px); overflow-y: auto; }
.history-item { background: var(--c-surface); border: 1px solid var(--c-border); border-radius: 8px; padding: 8px 10px; cursor: pointer; }
.history-item:hover { border-color: var(--c-border-strong); }
.history-item.active { border-color: #3b82f6; background: var(--c-primary-soft); }
.hi-top { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--c-text-3); }
.hi-names { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.hi-names b { color: var(--c-text); }
.hi-result { flex-shrink: 0; width: 20px; height: 20px; border-radius: 5px; font-size: 11px; font-weight: bold; display: inline-flex; align-items: center; justify-content: center; }
.hi-result.win { background: #3b82f6; color: #ffffff; }
.hi-result.loss { background: #ef4444; color: #ffffff; }
.hi-result.pending { background: var(--c-surface-4); color: var(--c-muted); }
.hi-shared { color: #3b82f6; }
.hi-del { background: none; border: none; color: var(--c-faint); cursor: pointer; padding: 0 2px; font-size: 14px; }
.hi-del:hover { color: var(--c-danger-text); }
.hi-meta { font-size: 11px; color: var(--c-faint); margin-top: 3px; padding-left: 26px; }
.history-empty { font-size: 12px; color: var(--c-faint); text-align: center; }

.quick-content { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.intro-card { background: var(--c-surface); border-radius: 12px; padding: 40px 32px; text-align: center; color: var(--c-text-3); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.intro-icon { font-size: 48px; color: #3b82f6; }
.intro-card h2 { margin: 0; color: var(--c-text); }
.intro-card ol { text-align: left; max-width: 560px; font-size: 13px; line-height: 1.9; }
.intro-card code { background: var(--c-surface-3); padding: 1px 5px; border-radius: 4px; }
.record-bar { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; background: var(--c-surface); border-radius: 10px; padding: 10px 14px; }
.rb-left, .rb-right { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.rb-left label { font-size: 13px; color: var(--c-text-3); display: flex; gap: 6px; align-items: center; }
.rb-left select { border: 1px solid var(--c-border-strong); border-radius: 6px; padding: 5px 8px; font-size: 13px; }
.share-hint { font-size: 12px; color: var(--c-muted); }
.share-hint a { color: var(--c-primary-text); }
.share-box { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; background: var(--c-primary-soft); border: 1px solid var(--c-primary-border); border-radius: 10px; padding: 8px 12px; color: var(--c-primary-text); }
.share-input { flex: 1; min-width: 220px; border: 1px solid var(--c-primary-border); border-radius: 6px; padding: 6px 10px; font-size: 12px; }
.stale-note { font-size: 12px; color: var(--c-warn-text); width: 100%; }
.btn-primary { background: #3b82f6; color: #ffffff; border: none; padding: 7px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-tool { border: 1px solid var(--c-border-strong); background: var(--c-surface); color: var(--c-text-2); border-radius: 6px; padding: 6px 12px; font-size: 12px; cursor: pointer; display: inline-flex; gap: 4px; align-items: center; }
.btn-tool:hover { background: var(--c-surface-3); }

@media (max-width: 900px) {
  .quick-main { grid-template-columns: 1fr; padding: 12px; }
  .history-list { max-height: 260px; }
}
</style>
