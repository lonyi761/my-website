// 1. 17 項預設職能資料 (繁體中文版)
export const DEFAULT_ROLES = [
  { id: 1, name: 'D潮拆塔', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 1 },
  { id: 2, name: '保鏢拆', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 2 },
  { id: 3, name: '埋頭猛拆', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 3 },
  { id: 4, name: '塔仇主T', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 4 },
  { id: 5, name: '增益絕', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 5 },
  { id: 6, name: '奶絕', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 6 },
  { id: 7, name: '指揮', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 7 },
  { id: 8, name: '清泉人傷', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 8 },
  { id: 9, name: '清泉保活', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 9 },
  { id: 10, name: '灌大團', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 10 },
  { id: 11, name: '點殺', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 11 },
  { id: 12, name: '燒屍體', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 12 },
  { id: 13, name: '破甲人傷', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 13 },
  { id: 14, name: '純保鏢', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 14 },
  { id: 15, name: '統戰', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 15 },
  { id: 16, name: '騰龍保鏢', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 16 },
  { id: 17, name: '騰龍合軸', desc: '—', identity: '—', tag: '—', tagSwitch: false, hideEquip: false, borderSwitch: false, sortOrder: 17 }
]

// 2. 150 人標準聯賽排表數據架構 (5 大隊 x 5 小隊 x 6 槽位)
const DEFAULT_TEAM_NAMES = ['一隊', '二隊', '三隊', '四隊', '五隊']

export function createDefaultSlot() {
  return {
    liupai_list: [],          // 最多 3 個流派
    liupai_xingtai_map: {},   // 流派形態 (御/素心等)
    zhineng_list: [],         // 綁定職能
    desc: '',                 // 槽位戰術說明
    jueji_pz: '',             // 絕技配裝
    qunxia_pz: '',            // 群俠配裝
    zhuangbei_pz: ''          // 裝備配裝
  }
}

export function createDefaultSquad(squadIdx) {
  return {
    hidden: false,
    name: `${squadIdx + 1}小隊`,
    zhineng: '',              // 小隊戰術職能 (如拆塔組)
    desc: '',
    slots: Array.from({ length: 6 }, () => createDefaultSlot())
  }
}

export function createDefaultTeam(teamIdx) {
  return {
    hidden: false,
    name: DEFAULT_TEAM_NAMES[teamIdx] || `${teamIdx + 1}隊`,
    desc: '',
    squads: Array.from({ length: 5 }, (_, i) => createDefaultSquad(i))
  }
}

export function createDefaultTemplate() {
  return {
    teams: Array.from({ length: 5 }, (_, i) => createDefaultTeam(i))
  }
}

// 3. 預設報名問題清單
export const DEFAULT_QUESTIONS = [
  { id: 1, title: '本週聯賽是否能準時出席？', type: 'radio', options: ['能準時出席', '需要請假', '不確定/晚到'], is_required: true, sort_order: 1 },
  { id: 2, title: '請選擇您的主力流派與次要流派', type: 'text', options: [], is_required: true, sort_order: 2 },
  { id: 3, title: '請填寫您的 Discord / 語音頻道 ID', type: 'text', options: [], is_required: false, sort_order: 3 }
]

// 4. 預設配裝範本資料
export const DEFAULT_BUILDS = [
  { id: 1, name: '拆塔爆發流', jueji: '殘陽夜月', qunxia: '方承意', zhuangbei: '75百煉破甲套' },
  { id: 2, name: '主T高防禦流', jueji: '太極圖', qunxia: '葉雪青', zhuangbei: '75百煉禦鐵套' },
  { id: 3, name: '廣域純奶流', jueji: '長歌獻君', qunxia: '無情', zhuangbei: '75百煉素問套' }
]