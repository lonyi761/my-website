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

    <!-- 右上角：控制台入口＋用戶選單（原本的深色帳號列已整合到這裡） -->
    <div class="nav-right">
      <button v-if="isSuperAdmin" class="btn-admin-nav" @click="account.openAdminView()">
        <i class="mdi mdi-cog-outline"></i> 總管理員控制台
      </button>

    <div class="user-menu-wrapper" @click.stop="showDropdown = !showDropdown">
      <span v-if="roleName" :class="['user-role-badge', profile?.role]">{{ roleName }}</span>
      <span class="user-name">{{ displayName }}</span>
      <i :class="['mdi', 'mdi-chevron-down', 'arrow-icon', { rotate: showDropdown }]"></i>

      <div v-if="showDropdown" class="user-dropdown-menu" @click.stop>
        <div class="account-info">
          <div class="account-info-row"><span>登入帳號</span><b>{{ username || '—' }}</b></div>
          <div class="account-info-row"><span>授權幫會</span><b>{{ guildNames || '—' }}</b></div>
          <div class="account-info-row"><span>到期日</span><b>{{ expireDate }}</b></div>
        </div>
        <button class="dropdown-item-btn" @click="openProfileModal">
          <i class="mdi mdi-account-outline margin-r"></i> 個人資料
        </button>
        <button class="dropdown-item-btn text-red" @click="handleLogout">
          <i class="mdi mdi-logout margin-r"></i> 登出
        </button>
      </div>
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
            <label>顯示名稱：</label>
            <input type="text" v-model="profileForm.username" placeholder="請輸入顯示名稱" class="input-field" />
          </div>
          <p class="field-hint">只會改變顯示的名稱，登入時仍使用原本的帳號 ID（{{ username }}）。</p>

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
import { ref, computed, onMounted, inject } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../utils/supabase'
import { notify } from '../../utils/notify'
import { getWriteError } from '../../utils/writeResult'

const props = defineProps({
  activeNav: String,
  username: String
})

const router = useRouter()

// 由 App.vue 提供的帳號資訊（登入頁以外的頁面都有）
const account = inject('account', null)
const profile = computed(() => account?.profile.value || null)
const guildNames = computed(() => account?.guildNames.value || '')
const roleName = computed(() => (profile.value ? account.roleName.value : ''))
const isSuperAdmin = computed(() => profile.value?.role === 'super_admin')
const displayName = computed(() => profile.value?.username || props.username || '')
const expireDate = computed(() => {
  if (profile.value?.role === 'super_admin') return '永久'
  return profile.value?.expire_at ? profile.value.expire_at.split('T')[0] : '—'
})
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
    username: displayName.value,
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  }
  showProfileModal.value = true
}

const handleLogout = async () => {
  showDropdown.value = false
  if (account) return account.logout()
  await supabase.auth.signOut()
  router.push('/login')
}

// 核心：保存個人資料與驗證舊密碼修改新密碼
const saveProfile = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return router.push('/login')

  const newName = profileForm.value.username.trim()
  const { oldPassword, newPassword, confirmPassword } = profileForm.value

  if (!newName) return notify('請輸入顯示名稱！')

  // 若使用者填寫了新密碼，進行舊密碼驗證流程
  if (newPassword || oldPassword) {
    if (!oldPassword) return notify('修改密碼請先輸入舊密碼！')
    if (!newPassword) return notify('請輸入新密碼！')
    if (newPassword.length < 6) return notify('新密碼長度至少需要 6 個字元！')
    if (newPassword !== confirmPassword) return notify('兩次輸入的新密碼不一致！')

    isSaving.value = true
    try {
      // 1. 使用舊密碼嘗試重登驗證舊密碼是否正確
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: session.user.email,
        password: oldPassword
      })

      if (authErr) {
        notify('舊密碼不正確，驗證失敗！')
        isSaving.value = false
        return
      }

      // 2. 舊密碼驗證成功，更新 Supabase Auth 密碼
      const { error: updatePassErr } = await supabase.auth.updateUser({
        password: newPassword
      })

      if (updatePassErr) throw updatePassErr

      notify('密碼修改成功！下次登入請使用新密碼。')
    } catch (err) {
      notify('修改密碼失敗：' + err.message)
      isSaving.value = false
      return
    }
  } else {
    isSaving.value = true
  }

  // 3. 更新 profiles 資料表名稱
  try {
    const error = getWriteError(await supabase
      .from('profiles')
      .update({ username: newName })
      .eq('id', session.user.id)
      .select('id'))
    if (error) throw new Error(error)

    // 直接更新頂部列的名稱，不用重新整理頁面（提示才不會被刷新蓋掉）
    if (account?.profile.value) account.profile.value.username = newName
    showProfileModal.value = false
    notify('個人資料已更新！')
  } catch (err) {
    notify('更新資料失敗：' + err.message)
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

.nav-right { display: flex; align-items: center; gap: 10px; }
.btn-admin-nav { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: bold; cursor: pointer; display: flex; align-items: center; gap: 4px; }
.btn-admin-nav:hover { background: #fde68a; }
.user-role-badge { font-size: 10px; color: #fff; background: #64748b; padding: 1px 6px; border-radius: 4px; }
.user-role-badge.super_admin { background: #ef4444; }
.user-role-badge.guild_admin { background: #3b82f6; }
.account-info { padding: 8px 16px 10px; border-bottom: 1px solid #f1f5f9; margin-bottom: 4px; min-width: 260px; }
.account-info-row { display: flex; justify-content: space-between; gap: 12px; font-size: 12px; color: #94a3b8; padding: 2px 0; }
.account-info-row span { white-space: nowrap; }
.account-info-row b { color: #334155; font-weight: 600; text-align: right; }
.field-hint { margin: -6px 0 10px; font-size: 11px; color: #94a3b8; }

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