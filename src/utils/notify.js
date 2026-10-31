// 頁面內提示：取代瀏覽器的 alert 跳窗，不會擋住操作，幾秒後自動消失
// 由 App.vue 的 <NoticeHost> 顯示；需要使用者做選擇的 confirm 仍保留跳窗
import { reactive } from 'vue'

export const notices = reactive([])

const ERROR_PATTERN = /失敗|錯誤|無法|找不到|未找到|未識別|不正確|不一致/
const WARNING_PATTERN = /^請|不能|最多|至少|已存在|無須|沒有|暫無|僅具備|尚無|還沒有|勿/

// 沒指定類型時依文字判斷：失敗類為紅色、提醒類為黃色、其他為綠色
const guessType = (message) => {
  if (ERROR_PATTERN.test(message)) return 'error'
  if (WARNING_PATTERN.test(message)) return 'warning'
  return 'success'
}

let seq = 0

export const dismissNotice = (id) => {
  const idx = notices.findIndex(n => n.id === id)
  if (idx >= 0) notices.splice(idx, 1)
}

export const notify = (message, type) => {
  const text = String(message ?? '')
  const kind = type || guessType(text)
  const id = ++seq
  notices.push({ id, text, type: kind })
  // 錯誤停留久一點，方便看清楚原因；最多同時顯示 4 則
  if (notices.length > 4) notices.splice(0, notices.length - 4)
  setTimeout(() => dismissNotice(id), kind === 'error' ? 7000 : 4000)
}
