// 候補 / 不出席席位區
// 不另開資料庫欄位：以一筆特殊項目附加在 guild_rosters.matrix_teams 陣列尾端保存
// { kind: '__bench__', substitutes: [member...], absentees: [member...] }
// 讀取時會從團隊清單中拆出，因此不會被當作團隊、也不會計入上陣職業統計

export const BENCH_KIND = '__bench__'

export const BENCH_ZONES = ['substitutes', 'absentees']

export const createEmptyBench = () => ({ substitutes: [], absentees: [] })

export const isBenchEntry = (item) => !!item && item.kind === BENCH_KIND

// 從資料庫的 matrix_teams 拆出 { teams, bench }
export const splitBenchFromTeams = (rawTeams) => {
  const list = Array.isArray(rawTeams) ? rawTeams : []
  const entry = list.find(isBenchEntry)
  return {
    teams: list.filter(t => !isBenchEntry(t)),
    bench: {
      substitutes: Array.isArray(entry?.substitutes) ? entry.substitutes : [],
      absentees: Array.isArray(entry?.absentees) ? entry.absentees : []
    }
  }
}

// 保存前把席位區合併回 matrix_teams；席位區皆為空時不附加，維持舊資料格式
export const mergeBenchIntoTeams = (teams, bench) => {
  const list = Array.isArray(teams) ? [...teams] : []
  const substitutes = bench?.substitutes || []
  const absentees = bench?.absentees || []
  if (substitutes.length > 0 || absentees.length > 0) {
    list.push({ kind: BENCH_KIND, substitutes, absentees })
  }
  return list
}
