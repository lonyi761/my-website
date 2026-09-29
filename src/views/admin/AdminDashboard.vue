<template>
  <div class="admin-dashboard">
    <div class="admin-header">
      <h2>總管理員控制台 - 帳號權限與多幫會指派</h2>
      <button class="btn-secondary" @click="$emit('back')">返回系統</button>
    </div>

    <div class="table-container margin-t">
      <table class="admin-table">
        <thead>
          <tr>
            <th width="120">帳號 (ID)</th>
            <th width="140">角色權限</th>
            <th>授權所屬幫會 (可複選)</th>
            <th width="120">到期時間</th>
            <th width="120">狀態</th>
            <th width="260">授權與帳號操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in userList" :key="user.id">
            <td class="font-bold">{{ user.username || (user.email ? user.email.split('@')[0] : user.id.slice(0, 8)) }}</td>
            
            <!-- 角色權限 -->
            <td>
              <select v-model="user.role" @change="updateUserRole(user)" class="select-sm">
                <option value="member">一般幫眾</option>
                <option value="guild_admin">幫主/統戰</option>
                <option value="super_admin">總管理員</option>
              </select>
            </td>

            <!-- 多幫會複選下拉選單 -->
            <td>
              <div class="multi-guild-picker" @click.stop>
                <div class="picker-trigger" @click="toggleGuildDropdown(user.id)">
                  <span class="selected-text">{{ getAssignedGuildNames(user) }}</span>
                  <i class="mdi mdi-chevron-down"></i>
                </div>

                <div v-if="activeDropdownUserId === user.id" class="picker-dropdown">
                  <div 
                    v-for="g in allGuilds" 
                    :key="g.id" 
                    class="dropdown-checkbox-item"
                    @click="toggleUserGuildSelection(user, g.id)"
                  >
                    <input 
                      type="checkbox" 
                      :checked="isGuildAssigned(user, g.id)" 
                      @click.stop="toggleUserGuildSelection(user, g.id)"
                    />
                    <span>{{ g.name }}</span>
                  </div>
                  <div v-if="allGuilds.length === 0" class="empty-hint">暫無幫會資料</div>
                </div>
              </div>
            </td>

            <td>{{ formatDate(user.expire_at) }}</td>

            <!-- 狀態 (使用中 / 已到期 / 已停權) 與 停權切換 -->
            <td>
              <div class="status-cell-group">
                <span :class="['status-tag', getUserStatusClass(user)]">
                  {{ getUserStatusLabel(user) }}
                </span>
                <button class="btn-link-sm margin-l" @click="toggleBanStatus(user)">
                  {{ user.status === '已停權' ? '恢復' : '停權' }}
                </button>
              </div>
            </td>

            <!-- 操作按鈕 (授權加天數 + 刪除帳號) -->
            <td>
              <div class="action-btn-group">
                <button class="btn-sm" @click="addDays(user, 30)">+30天</button>
                <button class="btn-sm margin-l" @click="addDays(user, 90)">+90天</button>
                <button class="btn-sm margin-l" @click="setPermanent(user)">永久授權</button>
                <button class="btn-link text-red font-bold margin-l" @click="confirmDeleteUser(user)">刪除</button>
              </div>
            </td>
          </tr>
          <tr v-if="userList.length === 0">
            <td colspan="6" class="empty-hint text-center">暫無使用者帳號資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 置中刪除確認 Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-card confirm-modal-card">
        <div class="confirm-modal-body">
          <div class="warning-icon-wrapper">
            <i class="mdi mdi-alert-circle warning-icon"></i>
          </div>
          <h3 class="confirm-title">{{ confirmTitle }}</h3>
          <p class="confirm-msg">{{ confirmMessage }}</p>
        </div>
        <div class="confirm-modal-footer">
          <button class="btn-secondary" @click="showConfirmModal = false">取消</button>
          <button class="btn-primary btn-red" @click="executeConfirmAction">確定刪除</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../utils/supabase'

defineEmits(['back'])

const userList = ref([])
const allGuilds = ref([])
const activeDropdownUserId = ref(null)

// 刪除確認 Modal 狀態
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmActionCallback = null

const triggerConfirmModal = (title, message, onConfirm) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmActionCallback = onConfirm
  showConfirmModal.value = true
}

const executeConfirmAction = () => {
  if (confirmActionCallback) confirmActionCallback()
  showConfirmModal.value = false
}

const toggleGuildDropdown = (userId) => {
  activeDropdownUserId.value = activeDropdownUserId.value === userId ? null : userId
}

const fetchData = async () => {
  // 1. 撈取所有幫會
  const { data: guildsData } = await supabase.from('guilds').select('*').order('created_at', { ascending: true })
  if (guildsData) allGuilds.value = guildsData

  // 2. 撈取使用者 Profile
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false })

  if (profilesData) {
    userList.value = profilesData.map(p => ({
      ...p,
      guild_ids: p.guild_ids || (p.guild_id ? [p.guild_id] : []),
      status: p.status || '使用中'
    }))
  }
}

const getAssignedGuildNames = (user) => {
  if (!user.guild_ids || user.guild_ids.length === 0) return '未指派幫會 (點擊選擇)'
  const names = allGuilds.value
    .filter(g => user.guild_ids.includes(g.id))
    .map(g => g.name)
  return names.length > 0 ? names.join('、') : '未指派幫會 (點擊選擇)'
}

const isGuildAssigned = (user, guildId) => {
  return Array.isArray(user.guild_ids) && user.guild_ids.includes(guildId)
}

const toggleUserGuildSelection = async (user, guildId) => {
  if (!Array.isArray(user.guild_ids)) user.guild_ids = []
  
  const idx = user.guild_ids.indexOf(guildId)
  if (idx > -1) {
    user.guild_ids.splice(idx, 1)
  } else {
    user.guild_ids.push(guildId)
  }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      guild_ids: user.guild_ids,
      guild_id: user.guild_ids[0] || null
    })
    .eq('id', user.id)

  if (error) {
    alert('變更幫會權限失敗：' + error.message)
  }
}

const updateUserRole = async (user) => {
  await supabase.from('profiles').update({ role: user.role }).eq('id', user.id)
}

// 停權 / 恢復 狀態切換
const toggleBanStatus = async (user) => {
  const nextStatus = user.status === '已停權' ? '使用中' : '已停權'
  user.status = nextStatus
  const { error } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', user.id)
  if (error) {
    alert('變更狀態失敗：' + error.message)
  }
}

const addDays = async (user, days) => {
  const current = new Date(user.expire_at < new Date().toISOString() ? new Date() : user.expire_at)
  current.setDate(current.getDate() + days)
  const newExpire = current.toISOString()

  const { error } = await supabase.from('profiles').update({ expire_at: newExpire }).eq('id', user.id)
  if (!error) {
    user.expire_at = newExpire
    alert(`已為【${user.username || (user.email ? user.email.split('@')[0] : '用戶')}】延長 ${days} 天！`)
  }
}

const setPermanent = async (user) => {
  const permanentDate = '2099-12-31T23:59:59.000Z'
  const { error } = await supabase.from('profiles').update({ expire_at: permanentDate }).eq('id', user.id)
  if (!error) {
    user.expire_at = permanentDate
    alert(`已為【${user.username || (user.email ? user.email.split('@')[0] : '用戶')}】設定永久授權！`)
  }
}

// 刪除使用者帳號
const confirmDeleteUser = (user) => {
  const name = user.username || (user.email ? user.email.split('@')[0] : user.id.slice(0, 8))
  triggerConfirmModal(
    '刪除帳號',
    `確定要刪除帳號「${name}」嗎？刪除後無法恢復。`,
    async () => {
      const { error } = await supabase.from('profiles').delete().eq('id', user.id)
      if (!error) {
        userList.value = userList.value.filter(u => u.id !== user.id)
      } else {
        alert('刪除帳號失敗：' + error.message)
      }
    }
  )
}

const formatDate = (dateStr) => dateStr ? dateStr.split('T')[0] : '—'

const getUserStatusLabel = (user) => {
  if (user.status === '已停權') return '已停權'
  if (new Date(user.expire_at) < new Date()) return '已到期'
  return '使用中'
}

const getUserStatusClass = (user) => {
  if (user.status === '已停權') return 'banned'
  if (new Date(user.expire_at) < new Date()) return 'expired'
  return 'active'
}

onMounted(() => {
  fetchData()
  window.addEventListener('click', () => { activeDropdownUserId.value = null })
})
</script>

<style scoped>
.admin-dashboard { padding: 20px; background: #ffffff; min-height: 80vh; font-size: 13px; }
.admin-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
.admin-header h2 { margin: 0; font-size: 16px; color: #1e293b; }
.admin-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
.admin-table th, .admin-table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; vertical-align: middle; }
.admin-table th { background: #f8fafc; color: #475569; }

/* 多選幫會元件樣式 */
.multi-guild-picker { position: relative; width: 100%; }
.picker-trigger { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; cursor: pointer; min-height: 20px; }
.selected-text { color: #1d4ed8; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; }

.picker-dropdown { position: absolute; top: 100%; left: 0; width: 100%; min-width: 200px; margin-top: 4px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.12); z-index: 100; max-height: 180px; overflow-y: auto; padding: 4px 0; }
.dropdown-checkbox-item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; cursor: pointer; transition: background 0.15s; }
.dropdown-checkbox-item:hover { background: #eff6ff; }
.empty-hint { padding: 8px 12px; color: #94a3b8; font-size: 12px; }

.status-cell-group { display: flex; align-items: center; }
.status-tag { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.status-tag.active { background: #d1fae5; color: #047857; }
.status-tag.expired { background: #fee2e2; color: #b91c1c; }
.status-tag.banned { background: #fee2e2; color: #991b1b; border: 1px solid #fca5a5; }

.action-btn-group { display: flex; align-items: center; gap: 4px; }
.btn-sm { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
.btn-sm:hover { background: #dbeafe; }
.btn-secondary { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; color: #334155; }
.select-sm { padding: 4px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none; }
.btn-link-sm { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }

/* Modal 通用樣式 */
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
.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 16px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-primary.btn-red { background: #ef4444; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }

.margin-l { margin-left: 6px; }
.font-bold { font-weight: bold; }
.text-red { color: #ef4444; }
.text-center { text-align: center; }
</style>