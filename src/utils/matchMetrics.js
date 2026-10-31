// 戰績報告用的衍生數據：佔比、效率、各項稱號、職業彙整
import { STAT_FIELDS } from './matchStatsCsv'

const num = (v) => Number(v) || 0
const ratio = (a, b) => (b ? a / b : 0)

export const sumBy = (players, key) => players.reduce((s, p) => s + num(p[key]), 0)

// 一方的總和（算佔比用）
export const sideTotals = (players) => Object.fromEntries(STAT_FIELDS.map(f => [f.key, sumBy(players, f.key)]))

// 每位玩家加上衍生欄位
// ka：擊敗＋助攻；kaShare：參戰率（K+A ÷ 本方總擊敗）；killEff：每次擊敗平均玩家傷害
// xxxShare：佔本方總量的比例；tankPerDeath：每次重傷前承受的傷害；rescueDiff：化羽/清泉 − 重傷（素問救援差）
export const withDerived = (players) => {
  const t = sideTotals(players)
  return players.map(p => {
    const ka = num(p.kills) + num(p.assists)
    return {
      ...p,
      ka,
      kaShare: ratio(ka, t.kills),
      killEff: num(p.kills) ? num(p.pvp) / num(p.kills) : 0,
      pvpShare: ratio(num(p.pvp), t.pvp),
      bldShare: ratio(num(p.bld), t.bld),
      healShare: ratio(num(p.heal), t.heal),
      tankShare: ratio(num(p.tank), t.tank),
      heavyShare: ratio(num(p.heavy), t.heavy),
      featherShare: ratio(num(p.feather), t.feather),
      boneShare: ratio(num(p.bone), t.bone),
      tankPerDeath: num(p.heavy) ? num(p.tank) / num(p.heavy) : num(p.tank),
      rescueDiff: num(p.feather) - num(p.heavy)
    }
  })
}

// 表格分頁：每頁的欄位。fmt：stat（萬／億縮寫）、pct（百分比）、int（整數）、diff（正負號）
// bar：在儲存格畫比例條；lowerIsBetter：排序與條狀圖以少為佳
export const REPORT_SECTIONS = [
  { key: 'overview', label: '總覽', icon: 'mdi-view-list', sort: 'pvp', columns: [
    { key: 'kills', label: '擊敗', fmt: 'int', bar: true }, { key: 'assists', label: '助攻', fmt: 'int' },
    { key: 'pvp', label: '玩家傷害', fmt: 'stat', bar: true }, { key: 'bld', label: '建築傷害', fmt: 'stat', bar: true },
    { key: 'heal', label: '治療', fmt: 'stat', bar: true }, { key: 'tank', label: '承傷', fmt: 'stat', bar: true },
    { key: 'heavy', label: '重傷', fmt: 'int', lowerIsBetter: true }, { key: 'feather', label: '化羽/清泉', fmt: 'int' },
    { key: 'bone', label: '焚骨', fmt: 'int' }, { key: 'res', label: '資源', fmt: 'stat' }
  ] },
  { key: 'kill', label: '擊殺', icon: 'mdi-sword-cross', sort: 'kills', columns: [
    { key: 'kills', label: '擊敗', fmt: 'int', bar: true }, { key: 'assists', label: '助攻', fmt: 'int', bar: true },
    { key: 'ka', label: 'K+A', fmt: 'int', bar: true }, { key: 'kaShare', label: '參戰率', fmt: 'pct', hint: '（擊敗＋助攻）÷ 本方總擊敗' },
    { key: 'killEff', label: '每擊敗傷害', fmt: 'stat', hint: '玩家傷害 ÷ 擊敗；越低代表越有效率', lowerIsBetter: true }
  ] },
  { key: 'damage', label: '輸出', icon: 'mdi-fire', sort: 'pvp', columns: [
    { key: 'pvp', label: '玩家傷害', fmt: 'stat', bar: true }, { key: 'pvpShare', label: '玩傷佔比', fmt: 'pct' },
    { key: 'bld', label: '建築傷害', fmt: 'stat', bar: true }, { key: 'bldShare', label: '塔傷佔比', fmt: 'pct' },
    { key: 'kills', label: '擊敗', fmt: 'int' }
  ] },
  { key: 'support', label: '治療承傷', icon: 'mdi-shield-plus', sort: 'heal', columns: [
    { key: 'heal', label: '治療', fmt: 'stat', bar: true }, { key: 'healShare', label: '治療佔比', fmt: 'pct' },
    { key: 'tank', label: '承傷', fmt: 'stat', bar: true }, { key: 'tankShare', label: '承傷佔比', fmt: 'pct' },
    { key: 'tankPerDeath', label: '承傷/重傷', fmt: 'stat', hint: '平均每次重傷前承受的傷害' }
  ] },
  { key: 'survive', label: '重傷救援', icon: 'mdi-heart-pulse', sort: 'heavy', sortDesc: true, columns: [
    { key: 'heavy', label: '重傷', fmt: 'int', bar: true, lowerIsBetter: true }, { key: 'heavyShare', label: '重傷佔比', fmt: 'pct' },
    { key: 'feather', label: '化羽/清泉', fmt: 'int', bar: true }, { key: 'featherShare', label: '救援佔比', fmt: 'pct' },
    { key: 'tank', label: '承傷', fmt: 'stat' }
  ] },
  { key: 'bone', label: '焚骨', icon: 'mdi-skull', sort: 'bone', jobs: ['九靈'], columns: [
    { key: 'bone', label: '焚骨', fmt: 'int', bar: true }, { key: 'boneShare', label: '焚骨佔比', fmt: 'pct' },
    { key: 'kills', label: '擊敗', fmt: 'int' }, { key: 'pvp', label: '玩家傷害', fmt: 'stat' }
  ] },
  { key: 'healer', label: '素問', icon: 'mdi-hand-heart', sort: 'heal', jobs: ['素問'], columns: [
    { key: 'heal', label: '治療', fmt: 'stat', bar: true }, { key: 'healShare', label: '治療佔比', fmt: 'pct' },
    { key: 'feather', label: '化羽/清泉', fmt: 'int', bar: true }, { key: 'heavy', label: '重傷', fmt: 'int', lowerIsBetter: true },
    { key: 'rescueDiff', label: '救援差', fmt: 'diff', hint: '化羽/清泉 − 重傷' }, { key: 'assists', label: '助攻', fmt: 'int' },
    { key: 'tank', label: '承傷', fmt: 'stat' }
  ] }
]

// 稱號：全場或單方各項第一；lowerIsBetter 的項目取最少者（且需有出賽數據）
export const TITLES = [
  { key: 'kills', title: '擊殺王', icon: 'mdi-sword-cross' },
  { key: 'assists', title: '助攻王', icon: 'mdi-handshake' },
  { key: 'pvp', title: '輸出王', icon: 'mdi-fire' },
  { key: 'bld', title: '拆塔王', icon: 'mdi-castle' },
  { key: 'heal', title: '治療王', icon: 'mdi-medical-bag' },
  { key: 'tank', title: '承傷王', icon: 'mdi-shield' },
  { key: 'feather', title: '救援王', icon: 'mdi-feather' },
  { key: 'bone', title: '焚骨王', icon: 'mdi-skull' },
  { key: 'res', title: '資源王', icon: 'mdi-treasure-chest' }
]

export const pickTitles = (players) => TITLES.map(t => {
  const top = players.reduce((best, p) => (num(p[t.key]) > num(best?.[t.key]) ? p : best), null)
  return top && num(top[t.key]) > 0 ? { ...t, player: top, value: num(top[t.key]) } : null
}).filter(Boolean)

// 職業彙整：人數、各項總和與平均
export const jobSummary = (players) => {
  const map = new Map()
  players.forEach(p => {
    const job = p.job || '未知'
    if (!map.has(job)) map.set(job, { job, count: 0, totals: Object.fromEntries(STAT_FIELDS.map(f => [f.key, 0])) })
    const row = map.get(job)
    row.count++
    STAT_FIELDS.forEach(f => { row.totals[f.key] += num(p[f.key]) })
  })
  return [...map.values()].map(r => ({
    ...r,
    avg: Object.fromEntries(STAT_FIELDS.map(f => [f.key, r.count ? r.totals[f.key] / r.count : 0]))
  })).sort((a, b) => b.count - a.count || b.totals.pvp - a.totals.pvp)
}

export const formatPct = (v) => (Number.isFinite(v) && v ? (v * 100).toFixed(v >= 0.1 ? 0 : 1) + '%' : '—')
