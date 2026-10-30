// 解析遊戲匯出的戰績 CSV（逆水寒 → 幫戰／聯賽結束後下載）
// 檔名：20261030_221115_我方幫會_對方幫會.csv
// 內容：兩個區塊以空行分隔，每塊第一行是「幫會名, 人數」，第二行是欄位名稱，之後每行一位玩家

// 欄位名稱 → 存進資料庫的鍵（同時接受簡體）
const COLUMN_KEYS = {
  玩家名字: 'name', 職業: 'job', 职业: 'job',
  擊敗: 'kills', 击败: 'kills', 助攻: 'assists', 資源: 'res', 资源: 'res',
  對玩家傷害: 'pvp', 对玩家伤害: 'pvp', 對建築傷害: 'bld', 对建筑伤害: 'bld',
  治療值: 'heal', 治疗值: 'heal', 承受傷害: 'tank', 承受伤害: 'tank',
  重傷: 'heavy', 重伤: 'heavy', '化羽/清泉': 'feather', 焚骨: 'bone'
}

// 數值欄位，順序即頁面顯示順序
export const STAT_FIELDS = [
  { key: 'kills', label: '擊敗' },
  { key: 'assists', label: '助攻' },
  { key: 'pvp', label: '對玩家傷害' },
  { key: 'bld', label: '對建築傷害' },
  { key: 'heal', label: '治療值' },
  { key: 'tank', label: '承受傷害' },
  { key: 'heavy', label: '重傷', lowerIsBetter: true },
  { key: 'feather', label: '化羽/清泉' },
  { key: 'bone', label: '焚骨' },
  { key: 'res', label: '資源' }
]

// 一行 CSV → 欄位陣列（處理雙引號與 "" 跳脫）
const splitCsvLine = (line) => {
  const cells = []
  let cur = ''
  let quoted = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++ }
      else if (ch === '"') quoted = false
      else cur += ch
    } else if (ch === '"') quoted = true
    else if (ch === ',') { cells.push(cur); cur = '' }
    else cur += ch
  }
  cells.push(cur)
  return cells.map(c => c.trim())
}

// 檔名開頭的日期時間 → Date（以使用者電腦的時區解讀）
const parsePlayedAt = (fileName) => {
  const m = /^(\d{4})(\d{2})(\d{2})_(\d{2})(\d{2})(\d{2})/.exec(fileName || '')
  if (!m) return null
  const [, y, mo, d, h, mi, s] = m.map(Number)
  const date = new Date(y, mo - 1, d, h, mi, s)
  return isNaN(date) ? null : date
}

const parseBlock = (lines) => {
  const [title, header, ...rows] = lines.map(splitCsvLine)
  const keys = header.map(h => COLUMN_KEYS[h])
  if (!keys.includes('name')) throw new Error('找不到「玩家名字」欄位，請確認是遊戲匯出的戰績 CSV。')
  const players = rows.map(cells => {
    const p = { name: '', job: '' }
    STAT_FIELDS.forEach(f => { p[f.key] = 0 })
    keys.forEach((key, i) => {
      if (!key) return
      if (key === 'name' || key === 'job') p[key] = cells[i] || ''
      else p[key] = Number(cells[i]) || 0
    })
    return p
  }).filter(p => p.name)
  return { name: title[0] || '', declaredCount: Number(title[1]) || players.length, players }
}

export const parseMatchCsv = (text, fileName = '') => {
  const lines = String(text).replace(/^﻿/, '').split(/\r?\n/)
  const blocks = []
  let cur = []
  for (const line of lines) {
    if (line.trim()) cur.push(line)
    else if (cur.length) { blocks.push(cur); cur = [] }
  }
  if (cur.length) blocks.push(cur)

  const sides = blocks.filter(b => b.length >= 2).map(parseBlock)
  if (sides.length !== 2) throw new Error(`應該有我方與對方兩個區塊，這個檔案讀到 ${sides.length} 個。`)
  return { fileName, playedAt: parsePlayedAt(fileName), sides }
}

// 數字縮寫：12,345 → 1.2萬；72,684,145 → 7,268萬；123,456,789 → 1.23億
export const formatStat = (n) => {
  const v = Number(n) || 0
  if (Math.abs(v) >= 1e8) return (v / 1e8).toFixed(2) + '億'
  if (Math.abs(v) >= 1e6) return Math.round(v / 1e4).toLocaleString() + '萬'
  if (Math.abs(v) >= 1e4) return (v / 1e4).toFixed(1) + '萬'
  return v.toLocaleString()
}
