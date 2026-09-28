<template>
  <div class="auth-container">
    <div class="auth-card">
      <h2 class="auth-title">{{ isRegister ? '註冊幫會帳號' : '聯賽排表系統登入' }}</h2>

      <form @submit.prevent="handleSubmit" class="auth-form">
        <div class="form-group">
          <label>電子郵件 (Email)</label>
          <input type="email" v-model="email" required placeholder="請輸入 Email" class="auth-input" />
        </div>

        <div class="form-group">
          <label>密碼</label>
          <input type="password" v-model="password" required placeholder="請輸入密碼" class="auth-input" />
        </div>

        <div v-if="isRegister" class="form-group">
          <label>幫會名稱 (新幫會或輸入既有幫會)</label>
          <input type="text" v-model="guildName" required placeholder="例如：百錵谷酒池肉林" class="auth-input" />
        </div>

        <div v-if="errorMessage" class="error-msg">{{ errorMessage }}</div>

        <button type="submit" class="btn-primary full-w margin-t" :disabled="loading">
          {{ loading ? '處理中...' : (isRegister ? '註冊帳號 (免費試用 7 天)' : '登入系統') }}
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
const email = ref('')
const password = ref('')
const guildName = ref('')
const loading = ref(false)
const errorMessage = ref('')

const handleSubmit = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    if (isRegister.value) {
      // 1. 註冊 Supabase Auth 帳號
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.value,
        password: password.value
      })
      if (authError) throw authError

      // 2. 尋找或建立幫會 (Guild)
      let guildId = null
      const { data: existingGuild } = await supabase
        .from('guilds')
        .select('id')
        .eq('name', guildName.value.trim())
        .single()

      if (existingGuild) {
        guildId = existingGuild.id
      } else {
        const { data: newGuild, error: guildError } = await supabase
          .from('guilds')
          .insert([{ name: guildName.value.trim() }])
          .select()
          .single()
        if (guildError) throw guildError
        guildId = newGuild.id
      }

      // 3. 更新 User Profile 所屬幫會
      await supabase
        .from('profiles')
        .update({ guild_id: guildId })
        .eq('id', authData.user.id)

      alert('註冊成功！預設開通 7 天免費試用。')
      isRegister.value = false
    } else {
      // 登入驗證
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email.value,
        password: password.value
      })
      if (authError) throw authError

      // 檢查 Profile 與使用天數 (expire_at)
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*, guilds(*)')
        .eq('id', authData.user.id)
        .single()

      if (profileError) throw profileError

      const now = new Date()
      const expireDate = new Date(profile.expire_at)

      if (profile.role !== 'super_admin' && expireDate < now) {
        await supabase.auth.signOut()
        throw new Error(`您的帳號已於 ${profile.expire_at.split('T')[0]} 到期，請聯繫總管理員開通使用天數！`)
      }

      emit('login-success', { user: authData.user, profile })
    }
  } catch (err) {
    errorMessage.value = err.message || '操作失敗，請重試'
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