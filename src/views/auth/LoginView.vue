<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2 class="auth-title">{{ isRegister ? '註冊帳號' : '聯賽排表系統登入' }}</h2>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label>帳號 (ID)</label>
          <input 
            type="text" 
            v-model="username" 
            required 
            placeholder="請輸入帳號 ID" 
            class="auth-input" 
          />
        </div>

        <div class="form-group">
          <label>密碼</label>
          <input 
            type="password" 
            v-model="password" 
            required 
            placeholder="請輸入密碼" 
            class="auth-input" 
          />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

        <button type="submit" class="btn-primary full-w margin-t" :disabled="loading">
          {{ loading ? '處理中...' : (isRegister ? '提交註冊 (等待管理員開通)' : '登入系統') }}
        </button>

        <div class="toggle-mode-row margin-t">
          <button type="button" class="btn-link" @click="isRegister = !isRegister; errorMessage = ''">
            {{ isRegister ? '已有帳號？點此登入' : '還沒有帳號？點此註冊' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../../utils/supabase'

const emit = defineEmits(['login-success'])

const isRegister = ref(false)
const username = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

// 將使用者輸入的帳號 ID 轉為 Supabase Auth 內部識別字串 (對使用者完全透明)
const getInternalEmail = (accId) => {
  const cleanId = accId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  return `${cleanId}@internal.roster`
}

const handleSubmit = async () => {
  const accountId = username.value.trim()
  if (!accountId) {
    errorMessage.value = '請輸入帳號 ID！'
    return
  }

  loading.value = true
  errorMessage.value = ''
  const internalEmail = getInternalEmail(accountId)

  try {
    if (isRegister.value) {
      // 1. 註冊 Supabase Auth 帳號 (攜帶 username 元數據)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password: password.value,
        options: {
          data: { username: accountId }
        }
      })
      if (authError) throw authError

      alert('註冊成功！請聯繫總管理員開通權限與指派幫會。')
      isRegister.value = false
    } else {
      // 2. 登入驗證
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password.value
      })
      if (authError) throw authError

      // 3. 讀取 Profile 資料與權限天數
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, guilds(*)')
        .eq('id', authData.user.id)
        .single()

      if (profileError) throw profileError

      const now = new Date()
      const expireDate = new Date(profile.expire_at)

      // 到期判定
      if (profile.role !== 'super_admin' && expireDate < now) {
        await supabase.auth.signOut()
        throw new Error(`您的帳號天數已於 ${profile.expire_at.split('T')[0]} 到期，請聯繫總管理員續期！`)
      }

      emit('login-success', { user: authData.user, profile })
    }
  } catch (err) {
    if (err.message.includes('Invalid login credentials')) {
      errorMessage.value = '帳號 ID 或密碼錯誤！'
    } else if (err.message.includes('User already registered')) {
      errorMessage.value = '該帳號 ID 已被註冊，請直接登入！'
    } else {
      errorMessage.value = err.message || '操作失敗，請重試'
    }
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.auth-container { display: flex; justify-content: center; align-items: center; min-height: 80vh; }
.auth-card { background: white; border-radius: 12px; border: 1px solid #cbd5e1; padding: 30px; width: 380px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.auth-title { margin: 0 0 20px 0; font-size: 18px; text-align: center; color: #1e293b; }
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.form-group { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #475569; }
.auth-input { padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.error-msg { color: #ef4444; font-size: 12px; text-align: center; }
.toggle-mode-row { text-align: center; }
.full-w { width: 100%; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.margin-t { margin-top: 12px; }
</style>