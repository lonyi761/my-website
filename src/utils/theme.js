// 亮色／暗色（夜晚版）主題：記在這台裝置的瀏覽器，下次開啟沿用
// index.html 會在載入前先套用，避免畫面先閃一下亮色
import { ref } from 'vue'

const STORAGE_KEY = 'theme'

const readSaved = () => {
  try { return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light' } catch { return 'light' }
}

export const theme = ref(readSaved())

const apply = (value) => {
  document.documentElement.dataset.theme = value
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', value === 'dark' ? '#0b1220' : '#2563eb')
}

apply(theme.value)

export const toggleTheme = () => {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  apply(theme.value)
  try { localStorage.setItem(STORAGE_KEY, theme.value) } catch { /* 無痕模式等無法儲存時只套用本次 */ }
}
