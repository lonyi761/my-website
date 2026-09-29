<template>
  <div class="auth-container">
    <div class="auth-card">
      <div class="auth-header-box">
        <div class="logo-icon-badge">
          <i class="mdi mdi-shield-account"></i>
        </div>
        <h2 class="auth-title">{{ isRegister ? '註冊帳號 (免費試用 7 天)' : '逆水寒團隊系統登入' }}</h2>
        <p class="auth-subtitle">歡迎使用逆水寒聯賽陣容即時排表系統</p>
      </div>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label><i class="mdi mdi-account-outline"></i> 帳號 (ID)</label>
          <input 
            type="text" 
            v-model="username" 
            required 
            placeholder="請輸入帳號 ID" 
            class="auth-input" 
          />
        </div>

        <div class="form-group">
          <label><i class="mdi mdi-lock-outline"></i> 密碼</label>
          <input 
            type="password" 
            v-model="password" 
            required 
            placeholder="請輸入密碼" 
            class="auth-input" 
          />
        </div>

        <div v-if="errorMessage" class="error-msg">
          <i class="mdi mdi-alert-circle-outline"></i> {{ errorMessage }}
        </div>

        <button type="submit" class="btn-primary full-w margin-t" :disabled="loading">
          <span v-if="loading" class="spinner"></span>
          {{ loading ? '處理中...' : (isRegister ? '註冊並開始 7 天免費試用' : '登入系統') }}
        </button>

        <div class="toggle-mode-row margin-t">
          <button type="button" class="btn-link" @click="toggleMode">
            {{ isRegister ? '已有帳號？點此登入' : '還沒有帳號？點此註冊' }}
          </button>
        </div>
      </form>
    </div>

    <!-- 客製化彈窗 Modal -->
    <div v-if="showSuccessModal" class="modal-overlay" @click.self="showSuccessModal = false">
      <div class="custom-success-card">
        <div class="success-icon-wrapper">
          <i class="mdi mdi-check-circle success-icon"></i>
        </div>
        <h3 class="success-title">註冊成功！</h3>
        <p class="success-desc">
          已自動為您開通 <strong>7 天免費試用期</strong>，現在即可登入使用。<br />
          <span class="sub-tip">如需與團隊 / 幫會共享資料庫，請聯繫總管理員協助綁定。</span>
        </p>
        <button class="btn-primary full-w margin-t btn-lg" @click="showSuccessModal = false">
          立即登入
        </button>
      </div>
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
const showSuccessModal = ref(false)

const toggleMode = () => {
  isRegister.value = !isRegister.value
  errorMessage.value = ''
}

const getInternalEmail = (accId) => {
  const cleanId = accId.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
  return `${cleanId}@app.com`
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
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: internalEmail,
        password: password.value,
        options: {
          data: { username: accountId }
        }
      })
      if (authError) throw authError

      showSuccessModal.value = true
      isRegister.value = false
    } else {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: internalEmail,
        password: password.value,
      })
      if (authError) throw authError

      let { data: profile } = await supabase
        .from('profiles')
        .select('*, guilds(*)')
        .eq('id', authData.user.id)
        .maybeSingle()

      if (!profile) {
        const defaultExpire = new Date()
        defaultExpire.setDate(defaultExpire.getDate() + 7)

        const defaultProfile = {
          id: authData.user.id,
          email: internalEmail,
          username: accountId,
          role: 'member',
          expire_at: defaultExpire.toISOString()
        }

        const { data: newProfile } = await supabase
          .from('profiles')
          .upsert([defaultProfile])
          .select('*, guilds(*)')
          .maybeSingle()

        profile = newProfile || defaultProfile
      }

      const expireAtStr = profile?.expire_at || new Date(Date.now() + 7 * 86400000).toISOString()
      const now = new Date()
      const expireDate = new Date(expireAtStr)

      if (profile?.role !== 'super_admin' && expireDate < now) {
        await supabase.auth.signOut()
        throw new Error(`您的 7 天免費試用已於 ${expireAtStr.split('T')[0]} 到期，請聯繫總管理員開通續期！`)
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
.auth-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
}

.auth-card {
  background: #ffffff;
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  padding: 36px 32px;
  width: 380px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.01);
}

.auth-header-box { text-align: center; margin-bottom: 24px; }
.logo-icon-badge {
  width: 48px;
  height: 48px;
  background: #eff6ff;
  color: #2563eb;
  font-size: 26px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 12px auto;
}
.auth-title { margin: 0 0 6px 0; font-size: 18px; font-weight: bold; color: #1e293b; }
.auth-subtitle { margin: 0; font-size: 12px; color: #94a3b8; }

.auth-form { display: flex; flex-direction: column; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #475569; font-weight: 600; }
.auth-input { padding: 10px 14px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 13px; outline: none; transition: all 0.2s; }
.auth-input:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }

.error-msg {
  background: #fef2f2;
  border: 1px solid #fecaca;
  color: #ef4444;
  padding: 8px 12px;
  border-radius: 6px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  font-size: 14px;
  transition: background 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.btn-primary:hover { background: #2563eb; }
.btn-primary:disabled { opacity: 0.7; cursor: not-allowed; }

.toggle-mode-row { text-align: center; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 13px; font-weight: 500; }
.btn-link:hover { text-decoration: underline; }

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}
.custom-success-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 28px 24px;
  width: 360px;
  text-align: center;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2);
  animation: modalPop 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}
@keyframes modalPop {
  0% { transform: scale(0.85); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}

.success-icon-wrapper {
  width: 56px;
  height: 56px;
  background: #d1fae5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 16px auto;
}
.success-icon { font-size: 36px; color: #059669; }
.success-title { margin: 0 0 10px 0; font-size: 18px; color: #0f172a; font-weight: bold; }
.success-desc { margin: 0 0 16px 0; font-size: 13px; color: #475569; line-height: 1.6; }
.sub-tip { font-size: 11px; color: #94a3b8; }
.btn-lg { padding: 10px 0; }

.full-w { width: 100%; }
.margin-t { margin-top: 12px; }
</style>