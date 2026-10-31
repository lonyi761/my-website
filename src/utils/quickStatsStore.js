// 快速分析的本機紀錄：存在這台電腦的瀏覽器（localStorage），不需登入、不會上傳
// 每筆：{ id, file_name, played_at, my_name, opp_name, my_players, opp_players, result, share_id, share_stale, added_at }

const KEY = 'quick_stats_history_v1'
const MAX_RECORDS = 100

export const loadQuickRecords = () => {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// 回傳錯誤訊息（例如瀏覽器空間不足），成功時回傳 null
export const saveQuickRecords = (list) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX_RECORDS)))
    return null
  } catch (err) {
    return err?.name === 'QuotaExceededError' ? '瀏覽器儲存空間已滿，請刪除部分舊紀錄。' : '無法儲存到瀏覽器（可能是無痕模式）。'
  }
}

// 同一份 CSV（檔名、雙方名稱與人數都相同）視為重複
export const recordFingerprint = (r) => [r.file_name, r.my_name, r.opp_name, r.my_players.length, r.opp_players.length].join('|')

export const newRecordId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2))

// 依比賽時間（沒有則用加入時間）新到舊
export const sortRecords = (list) => [...list].sort((a, b) => String(b.played_at || b.added_at).localeCompare(String(a.played_at || a.added_at)))
