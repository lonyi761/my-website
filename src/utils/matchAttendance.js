// 戰績 CSV 玩家 ↔ 成員對應，以及與排表比對出勤
import { splitBenchFromTeams } from '../views/league/rosterBench'

// 手動標記為「非成員／外援」
export const NOT_MEMBER = '__none__'

// 比對用：去掉空白並統一全形半形
const normalizeName = (name) => String(name || '').normalize('NFKC').replace(/\s+/g, '')

export const isNotMemberLink = (how) => how === 'notMember' || how === 'pastNotMember'

// CSV 玩家 → { name, job, memberId, how }
// how：manual（手動指定）、name（名字相同）、former（曾用名相同）、
//      notMember（手動標記非成員）、ambiguous（多位成員同名）、none（找不到）、
//      past／pastNotMember（沿用同幫會其他場次的手動指定）
// 自動對應只找本聯賽所屬的幫會（幫會聯賽用幫會名單、俱樂部比賽用俱樂部名單），
// 因為同一人可能同時在幫會與俱樂部各有一筆成員資料；其他幫會的人只能手動指定
// 先比名字、再比曾用名；同一層有多位符合時不自動對應
// pastLinks 只在自動對應失敗（同名多位或找不到）時才使用，名字唯一相符的仍以名字為準
export const linkPlayers = (players, members, guildId, manualLinks = {}, pastLinks = {}) => {
  const tiers = [{ how: 'name' }, { how: 'former' }]
  const index = tiers.map(() => new Map())
  members.filter(m => m.guild_id === guildId).forEach(m => {
    const add = (tierIdx, key) => {
      if (!key) return
      const map = index[tierIdx]
      const list = map.get(key) || []
      if (!list.includes(m.id)) list.push(m.id)
      map.set(key, list)
    }
    add(0, normalizeName(m.name))
    ;(m.former_names || []).forEach(n => add(1, normalizeName(n)))
  })
  const memberIds = new Set(members.map(m => m.id))

  return players.map(p => {
    const manual = manualLinks[p.name]
    if (manual === NOT_MEMBER) return { name: p.name, job: p.job, memberId: null, how: 'notMember' }
    if (manual && memberIds.has(manual)) return { name: p.name, job: p.job, memberId: manual, how: 'manual' }

    const key = normalizeName(p.name)
    let unresolved = { name: p.name, job: p.job, memberId: null, how: 'none' }
    for (let i = 0; i < tiers.length; i++) {
      const hits = index[i].get(key)
      if (!hits) continue
      if (hits.length === 1) return { name: p.name, job: p.job, memberId: hits[0], how: tiers[i].how }
      unresolved = { ...unresolved, how: 'ambiguous', candidates: hits }
      break
    }

    const past = pastLinks[p.name]
    if (past === NOT_MEMBER) return { name: p.name, job: p.job, memberId: null, how: 'pastNotMember' }
    if (past && memberIds.has(past)) return { name: p.name, job: p.job, memberId: past, how: 'past', candidates: unresolved.candidates }
    return unresolved
  })
}

// 同幫會其他場次的手動指定 → { CSV 玩家名: 成員 id 或 NOT_MEMBER }，同一名字以最近更新的場次為準
export const collectPastLinks = (rows, excludeId) => {
  const links = {}
  ;[...rows]
    .filter(r => r.id !== excludeId)
    .sort((a, b) => String(a.updated_at || '').localeCompare(String(b.updated_at || '')))
    .forEach(r => Object.assign(links, r.member_links || {}))
  return links
}

// 排表 matrix_teams → 每位成員的位置
export const readRosterPlacement = (matrixTeams) => {
  const { teams, bench } = splitBenchFromTeams(matrixTeams)
  const seated = new Map()
  teams.forEach(team => (team.squads || []).forEach(squad => (squad.slots || []).forEach(slot => {
    const m = slot?.assignedMember
    if (m?.id) seated.set(m.id, { name: m.name, team: team.name || '', squad: squad.name || '', place: `${team.name || ''} ${squad.name || ''}`.trim() })
  })))
  const toMap = (list) => new Map((list || []).filter(m => m?.id).map(m => [m.id, { name: m.name }]))
  return { seated, substitutes: toMap(bench.substitutes), absentees: toMap(bench.absentees) }
}

// 比對結果（只看我方）
// hasRoster=false 時表示這場聯賽還沒排表，只能顯示成員對應
export const buildAttendance = (linkedPlayers, placement, membersById, guildId) => {
  const played = new Map(linkedPlayers.filter(p => p.memberId).map(p => [p.memberId, p]))
  const hasRoster = placement.seated.size + placement.substitutes.size + placement.absentees.size > 0
  const memberName = (id, fallback) => membersById.get(id)?.name || fallback || '（已刪除的成員）'

  const seatedPlayed = []
  const seatedMissing = []
  placement.seated.forEach((info, id) => {
    const entry = { memberId: id, name: memberName(id, info.name), place: info.place }
    if (played.has(id)) seatedPlayed.push({ ...entry, csvName: played.get(id).name })
    else seatedMissing.push(entry)
  })

  const subsPlayed = []
  placement.substitutes.forEach((info, id) => {
    if (played.has(id)) subsPlayed.push({ memberId: id, name: memberName(id, info.name), csvName: played.get(id).name })
  })

  const absentPlayed = []
  let absentConfirmed = 0
  placement.absentees.forEach((info, id) => {
    if (played.has(id)) absentPlayed.push({ memberId: id, name: memberName(id, info.name), csvName: played.get(id).name })
    else absentConfirmed++
  })

  // 有上場、是成員，但排表裡沒有他（他幫成員另外標出幫會）
  const unplanned = []
  played.forEach((p, id) => {
    if (placement.seated.has(id) || placement.substitutes.has(id) || placement.absentees.has(id)) return
    const m = membersById.get(id)
    unplanned.push({ memberId: id, name: memberName(id), csvName: p.name, otherGuild: m && m.guild_id !== guildId ? m.guild_id : null })
  })

  const unlinked = linkedPlayers.filter(p => !p.memberId && !isNotMemberLink(p.how))
  const notMembers = linkedPlayers.filter(p => isNotMemberLink(p.how))

  return { hasRoster, seatedPlayed, seatedMissing, subsPlayed, absentPlayed, absentConfirmed, unplanned, unlinked, notMembers }
}
