// 流派清單（成員、排表、戰備模板共用）：名稱、圖示檔名、文字色、底色
// 新增流派時只需改這裡，並在 src/assets/schools/ 放入同檔名的圖示
export const SCHOOLS = [
  { name: '鐵衣', file: 'ty', color: '#d97706', bg: '#fef3c7' },
  { name: '血河', file: 'xh', color: '#e11d48', bg: '#ffe4e6' },
  { name: '九靈', file: 'jl', color: '#8b5cf6', bg: '#f3e8ff' },
  { name: '神相', file: 'sx', color: '#6366f1', bg: '#e0e7ff' },
  { name: '碎夢', file: 'sm', color: '#06b6d4', bg: '#cffaff' },
  { name: '素問', file: 'sw', color: '#f43f5e', bg: '#ffe4e6' },
  { name: '龍吟', file: 'ly', color: '#10b981', bg: '#d1fae5' },
  { name: '玄機', file: 'xj', color: '#84cc16', bg: '#ecfccb' },
  { name: '潮光', file: 'cg', color: '#38bdf8', bg: '#f0f9ff' },
  { name: '滄瀾', file: 'cl', color: '#0284c7', bg: '#e0e7ff' }
]

// 戰備排表模板另外可選「鴻音」（維持原本行為：成員資料與排表尚未開放，也還沒有圖示）
export const TEMPLATE_SCHOOLS = [
  ...SCHOOLS,
  { name: '鴻音', file: 'hy', color: '#ec4899', bg: '#fce7f3' }
]

export const SCHOOL_NAMES = SCHOOLS.map(s => s.name)

// 流派名稱 → 底色
export const schoolBgMap = (list = SCHOOLS) => Object.fromEntries(list.map(s => [s.name, s.bg]))

// 建置時一併打包所有流派圖示；找不到圖示時回傳空字串
const icons = import.meta.glob('../assets/schools/*.png', { eager: true, import: 'default' })

export const getSchoolImg = (fileName) => (fileName ? icons[`../assets/schools/${fileName}.png`] || '' : '')
