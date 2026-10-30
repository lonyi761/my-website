// 檢查 Supabase 寫入結果，回傳錯誤訊息（成功時回傳 null）。
// 資料列權限（RLS）擋下修改／刪除時不會回傳 error，只會影響 0 筆，
// 因此修改與刪除需搭配 .select('id') 取回實際影響的資料列來判斷。
export const getWriteError = ({ data, error }) => {
  if (error) return error.message
  if (Array.isArray(data) && data.length === 0) return '沒有修改權限，或資料已不存在。'
  return null
}
