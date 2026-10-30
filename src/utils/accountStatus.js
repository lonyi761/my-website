// 帳號是否可使用（與資料庫 is_active_user() 規則一致）
// 回傳 null 表示可使用，否則回傳原因代碼
export const getAccountBlockReason = (profile) => {
  if (!profile) return 'missing'
  if (profile.status === '已停權') return 'banned'
  if (profile.role !== 'super_admin' && profile.expire_at && new Date(profile.expire_at) < new Date()) return 'expired'
  return null
}

export const getAccountBlockMessage = (reason, profile) => {
  if (reason === 'missing') return '此帳號已被刪除或不存在，請聯繫總管理員。'
  if (reason === 'banned') return '此帳號已被停權，請聯繫總管理員。'
  if (reason === 'expired') {
    const date = profile?.expire_at ? `已於 ${profile.expire_at.split('T')[0]} ` : '已'
    return `您的使用期限${date}到期，請聯繫總管理員開通續期！`
  }
  return ''
}

// 帳號 ID 只能使用英文、數字、底線（登入時不分大小寫）
export const ACCOUNT_ID_PATTERN = /^[A-Za-z0-9_]+$/
