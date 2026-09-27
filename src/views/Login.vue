<template>
  <div class="sky-login-bg">
    <div class="top-actions">
      <button class="icon-circle" title="切換模式">
        <i class="mdi mdi-brightness-7"></i>
      </button>
    </div>

    <div class="login-glass-card">
      <div class="logo-wrapper">
        <div class="logo-circle">
          <span class="logo-text">行優</span>
        </div>
        <p class="brand-subtitle">行優測試用</p>
      </div>

      <form @submit.prevent="handleSubmit" class="login-form">
        <div class="input-box">
          <i class="mdi mdi-account outline-icon"></i>
          <input type="text" v-model="username" placeholder="用戶名" />
        </div>

        <div class="input-box">
          <i class="mdi mdi-lock-outline outline-icon"></i>
          <input type="password" v-model="password" placeholder="密碼" />
        </div>

        <button type="submit" class="btn-submit">
          {{ isRegister ? '註冊並領取試用' : '登入' }}
        </button>
      </form>

      <div class="card-footer">
        <span @click="isRegister = !isRegister">
          {{ isRegister ? '已有帳號？返回登入' : '註冊帳號' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isRegister = ref(false)
const username = ref('VIP')
const password = ref('123')

const handleSubmit = async () => {
  if (!username.value || !password.value) return alert('請填寫帳號與密碼！')

  const endpoint = isRegister.value ? '/api/register' : '/api/login'

  try {
    // 正確連向 Render 雲端後端網址
    const res = await fetch(`https://my-website-backend-v04t.onrender.com${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username.value,
        password: password.value
      })
    })

    const data = await res.json()

    if (!data.success) {
      alert(data.message)
      return
    }

    if (isRegister.value) {
      alert(data.message)
      isRegister.value = false
    } else {
      localStorage.setItem('user', JSON.stringify(data.user))
      router.push('/home')
    }
  } catch (error) {
    alert('連線失敗！請確認後端伺服器是否已啟動。')
  }
}
</script>

<style scoped>
.sky-login-bg { width: 100vw; height: 100vh; background: linear-gradient(180deg, #628de6 0%, #8caef4 50%, #b8d1ff 100%); display: flex; justify-content: center; align-items: center; position: relative; }
.top-actions { position: absolute; top: 20px; right: 25px; }
.icon-circle { width: 32px; height: 32px; border-radius: 50%; background: rgba(255, 255, 255, 0.4); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
.login-glass-card { width: 90%; max-width: 380px; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(10px); border-radius: 12px; padding: 35px 30px 20px 30px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.12); text-align: center; }
.logo-circle { width: 72px; height: 72px; border-radius: 50%; background: #ffffff; border: 1px solid #e2e8f0; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05); }
.logo-text { font-size: 18px; font-weight: bold; color: #2c3e50; }
.brand-subtitle { font-size: 12px; color: #64748b; margin-bottom: 25px; }
.input-box { position: relative; margin-bottom: 16px; }
.input-box .outline-icon { position: absolute; left: 12px; top: 10px; color: #94a3b8; font-size: 18px; }
.input-box input { width: 100%; padding: 10px 10px 10px 38px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; background: #f8fafc; font-size: 14px; }
.btn-submit { width: 100%; padding: 10px; background: #5b79e2; color: white; border: none; border-radius: 6px; font-size: 15px; cursor: pointer; margin-top: 8px; }
.card-footer { margin-top: 18px; font-size: 12px; color: #64748b; text-align: right; cursor: pointer; }
</style>