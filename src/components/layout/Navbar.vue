<template>
  <header class="top-navbar">
    <div class="nav-brand">
      <span class="brand-title">逆水寒團隊系統</span>
    </div>

    <!-- 主導航選單 -->
    <nav class="nav-links">
      <router-link to="/members" :class="['nav-item', { active: activeNav === 'members' }]">成員</router-link>
      <router-link to="/league" :class="['nav-item', { active: activeNav === 'league' }]">聯賽</router-link>
      <router-link to="/preparation" :class="['nav-item', { active: activeNav === 'preparation' }]">戰備</router-link>
    </nav>

    <!-- 右上角用戶選單 -->
    <div class="user-menu-wrapper" @click.stop="showDropdown = !showDropdown">
      <span class="user-name">{{ username || 'VIP' }}</span>
      <i :class="['mdi', 'mdi-chevron-down', 'arrow-icon', { rotate: showDropdown }]"></i>

      <div v-if="showDropdown" class="user-dropdown-menu" @click.stop>
        <button class="dropdown-item-btn" @click="openProfileModal">
          <i class="mdi mdi-account-outline margin-r"></i> 個人資料
        </button>
        <button class="dropdown-item-btn text-red" @click="handleLogout">
          <i class="mdi mdi-logout margin-r"></i> 登出
        </button>
      </div>
    </div>

    <!-- 個人資料 / 修改密碼 Modal -->
    <div v-if="showProfileModal" class="modal-overlay" @click.self="showProfileModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>修改個人資料</h3>
          <span class="close-btn" @click="showProfileModal = false">&times;</span>
        </div>

        <div class="modal-body">
          <div class="form-row">
            <label>帳號名稱：</label>
            <input type="text" v-model="profileForm.username" placeholder="請輸入帳號名稱" class="input-field" />
          </div>

          <hr class="divider-line" />
          <div class="section-sub-title">修改密碼 (若無須修改可留空)</div>

          <div class="form-row">
            <label>舊密碼：</label>
            <input type="password" v-model="profileForm.oldPassword" placeholder="修改密碼須先驗證舊密碼" class="input-field" />
          </div>

          <div class="form-row">
            <label>新密碼：</label>
            <input type="password" v-model="profileForm.newPassword" placeholder="請輸入新密碼 (至少6位)" class="input-field" />
          </div>

          <div class="form-row">
            <label>確認新密碼：</label>
            <input type="password" v-model="profileForm.confirmPassword" placeholder="請再次輸入新密碼" class="input-field" />
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showProfileModal = false">取消</button>
          <button class="btn-primary" :disabled="isSaving" @click="saveProfile">
            {{ isSaving ? '保存中...' : '確定修改' }}
          </button>
        </div>
      </div>
    </div>

  </header>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../utils/supabase'

const props = defineProps({
  activeNav: String,
  username: String
})

const router = useRouter()
const showDropdown = ref(false)
const showProfileModal = ref(false)
const isSaving = ref(false)
const userEmail = ref('')

const profileForm = ref({
  username: '',
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
})

const closeDropdown = () => { showDropdown.value = false }

const openProfileModal = () => {
  showDropdown.value = false
  profileForm.value = {
    username: props.username || '',
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  showProfileModal.value = true
}

const handleLogout = async () => {
  await supabase.auth.signOut()
  localStorage.removeItem('user')
  router.push('/login')
}

// 核心：保存個人資料與驗證舊密碼修改新密碼
const saveProfile = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return router.push('/login')

  const newName = profileForm.value.username.trim()
  const { oldPassword, newPassword, confirmPassword } = profileForm.value

  if (!newName) return alert('請輸入帳號名稱！')

  // 若使用者填寫了新密碼，進行舊密碼驗證流程
  if (newPassword || oldPassword) {
    if (!oldPassword) return alert('修改密碼請先輸入舊密碼！')
    if (!newPassword) return alert('請輸入新密碼！')
    if (newPassword.length < 6) return alert('新密碼長度至少需要 6 個字元！')
    if (newPassword !== confirmPassword) return alert('兩次輸入的新密碼不一致！')

    isSaving.value = true
    try {
      // 1. 使用舊密碼嘗試重登驗證舊密碼是否正確
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: oldPassword
      })

      if (authErr) {
        alert('舊密碼不正確，驗證失敗！')
        isSaving.value = false
        return
      }

      // 2. 舊密碼驗證成功，更新 Supabase Auth 密碼
      const { error: updatePassErr } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updatePassErr) throw updatePassErr

      alert('密碼修改成功！下次登入請使用新密碼。')
    } catch (err) {
      alert('修改密碼失敗：' + err.message)
      isSaving.value = false
      return
    }
  } else {
    isSaving.value = true
  }

  // 3. 更新 profiles 資料表名稱
  try {
    await supabase
      .from('profiles')
      .update({ username: newName })
      .eq('id', session.user.id)

    showProfileModal.value = false
    alert('個人資料已成功更新！頁面將刷新帶入最新名稱。')
    window.location.reload()
  } catch (err) {
    alert('更新資料失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}

onMounted(() => {
  window.addEventListener('click', closeDropdown)
})
</script>

<style scoped>
.top-navbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #ffffff;
  padding: 0 24px;
  height: 56px;
  border-bottom: 1px solid #e2e8f0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.02);
  position: relative;
  z-index: 100;
}

.brand-title {
  font-size: 16px;
  font-weight: bold;
  color: #1e293b;
}

.nav-links {
  display: flex;
  gap: 24px;
}
.nav-item {
  text-decoration: none;
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  padding: 16px 0;
  border-bottom: 2px solid transparent;
  transition: all 0.2s;
}
.nav-item.active, .nav-item:hover {
  color: #2563eb;
  border-bottom-color: #2563eb;
  font-weight: bold;
}

.user-menu-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  transition: background 0.2s;
}
.user-menu-wrapper:hover {
  background: #f1f5f9;
}
.user-name {
  font-size: 13px;
  font-weight: bold;
  color: #334155;
}
.arrow-icon {
  font-size: 16px;
  color: #94a3b8;
  transition: transform 0.2s;
}
.arrow-icon.rotate {
  transform: rotate(180deg);
}

.user-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 6px;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.1);
  padding: 4px 0;
  min-width: 130px;
  z-index: 120;
}
.dropdown-item-btn {
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  padding: 8px 16px;
  font-size: 12px;
  cursor: pointer;
  color: #334155;
  display: flex;
  align-items: center;
}
.dropdown-item-btn:hover {
  background: #f1f5f9;
}
.margin-r { margin-right: 6px; }
.text-red { color: #ef4444; }

/* Modal 通用 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0,0,0,0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
}
.modal-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  color: #333;
}
.medium-card { width: 440px; }
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}
.close-btn {
  cursor: pointer;
  font-size: 20px;
  color: #94a3b8;
}
.form-row {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
  font-size: 13px;
}
.form-row label {
  width: 90px;
  font-weight: bold;
  color: #334155;
}
.input-field {
  flex: 1;
  padding: 6px 10px;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 13px;
  outline: none;
}
.divider-line {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 16px 0 12px 0;
}
.section-sub-title {
  font-size: 12px;
  font-weight: bold;
  color: #2563eb;
  margin-bottom: 12px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}
.btn-primary {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.btn-secondary {
  background: #f1f5f9;
  color: #334155;
  border: 1px solid #cbd5e1;
  padding: 6px 16px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
</style>