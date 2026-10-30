// 跨場次彙整：每位成員的出賽紀錄、勝率、排表出勤與平均數據（只看我方）
import { STAT_FIELDS } from './matchStatsCsv'
import { linkPlayers, collectPastLinks, readRosterPlacement, isNotMemberLink } from './matchAttendance'

const pickStats = (p) => Object.fromEntries(STAT_FIELDS.map(f => [f.key, Number(p[f.key]) || 0]))

// rows：要統計的 match_stats；linkRows：用來沿用手動指定的場次（篩選期間時仍應傳入全部場次）
// leaguesById：guild_rosters（含 title、type、start_time、results，有排表時含 matrix_teams）
// 外援（手動標記非成員）不列入；對應不到成員的玩家以 CSV 名稱單獨列出
export const aggregateMemberStats = ({ rows, linkRows = rows, leaguesById, members, guildId }) => {
  const membersById = new Map(members.map(m => [m.id, m]))
  const entries = new Map()
  const placements = new Map()

  const entryFor = (key, init) => {
    if (!entries.has(key)) entries.set(key, { key, games: [], missed: [], ...init })
    return entries.get(key)
  }
  const memberEntry = (id, fallbackName) => {
    const m = membersById.get(id)
    return entryFor(id, { memberId: id, name: m?.name || fallbackName || '（已刪除的成員）', guildId: m?.guild_id || null, unlinked: false })
  }

  const matches = rows.map(row => {
    const league = leaguesById.get(row.league_id) || {}
    const result = league.results?.[row.match_index] || '還沒出'
    const match = {
      id: row.id,
      leagueId: row.league_id,
      matchIndex: row.match_index,
      title: league.title || '（已刪除的聯賽）',
      type: league.type || '',
      date: row.played_at || league.start_time || null,
      oppName: row.opp_name || '',
      result
    }

    const linked = linkPlayers(row.my_players || [], members, guildId, row.member_links || {}, collectPastLinks(linkRows, row.id))
    const playedIds = new Set()
    ;(row.my_players || []).forEach((p, i) => {
      const link = linked[i]
      if (isNotMemberLink(link.how)) return
      const entry = link.memberId
        ? memberEntry(link.memberId, p.name)
        : entryFor('csv:' + p.name, { memberId: null, name: p.name, guildId: null, unlinked: true })
      if (link.memberId) playedIds.add(link.memberId)
      entry.games.push({ ...match, csvName: p.name, job: p.job, stats: pickStats(p) })
    })

    // 有排表的場次：排了卻沒上場的成員記一次缺席
    if (!placements.has(row.league_id)) placements.set(row.league_id, readRosterPlacement(league.matrix_teams || []))
    placements.get(row.league_id).seated.forEach((info, id) => {
      if (!playedIds.has(id)) memberEntry(id, info.name).missed.push({ ...match, place: info.place })
    })
    match.hasRoster = placements.get(row.league_id).seated.size > 0
    match.seatedIds = new Set(placements.get(row.league_id).seated.keys())
    return match
  })

  const matchById = new Map(matches.map(m => [m.id, m]))
  const players = [...entries.values()].map(e => {
    const totals = Object.fromEntries(STAT_FIELDS.map(f => [f.key, e.games.reduce((s, g) => s + g.stats[f.key], 0)]))
    const count = e.games.length
    const averages = Object.fromEntries(STAT_FIELDS.map(f => [f.key, count ? totals[f.key] / count : 0]))
    const decided = e.games.filter(g => g.result === '我方贏' || g.result === '對方贏')
    const wins = decided.filter(g => g.result === '我方贏').length
    const jobCounts = {}
    e.games.forEach(g => { jobCounts[g.job] = (jobCounts[g.job] || 0) + 1 })
    const mainJob = Object.entries(jobCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || membersById.get(e.memberId)?.current_school || ''
    // 有排表的場次中被排進席位的次數＝有上場且在席位上＋排了沒上
    const seatedPlayed = e.memberId ? e.games.filter(g => matchById.get(g.id)?.seatedIds.has(e.memberId)).length : 0
    return {
      ...e,
      count,
      totals,
      averages,
      wins,
      decided: decided.length,
      winRate: decided.length ? wins / decided.length : null,
      mainJob,
      jobs: Object.keys(jobCounts),
      seatedCount: seatedPlayed + e.missed.length,
      missedCount: e.missed.length,
      games: [...e.games].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
    }
  })

  return { players, matches }
}
