<template>
  <div class="admin-dashboard">
    <div class="admin-header">
      <h2>總管理員控制台 - 帳號權限與多幫會指派</h2>
      <button class="btn-secondary" @click="$emit('back')">返回系統</button>
    </div>

    <!-- 區塊一：註冊人員與天數狀態管理 -->
    <div class="admin-section-card margin-t">
      <div class="section-header">
        <h3><i class="mdi mdi-account-group margin-r"></i> 註冊人員與天數狀態管理</h3>
        <span class="count-badge">共 {{ userList.length }} 人</span>
      </div>

      <div class="table-container margin-t">
        <table class="admin-table">
          <thead>
            <tr>
              <th width="140">帳號 (ID)</th>
              <th width="140">全局角色權限</th>
              <th width="130">到期時間</th>
              <th width="110">帳號狀態</th>
              <th>授權天數與帳號操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in userList" :key="'user_' + user.id">
              <td class="font-bold">{{ getUserDisplayName(user) }}</td>
              
              <!-- 角色權限 -->
              <td>
                <select v-model="user.role" @change="updateUserRole(user)" class="select-sm">
                  <option value="member">一般幫眾</option>
                  <option value="guild_admin">幫主/統戰</option>
                  <option value="super_admin">總管理員</option>
                </select>
              </td>

              <td>{{ formatDate(user.expire_at) }}</td>

              <!-- 狀態與停權按鈕 -->
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

              <!-- 授權操作 -->
              <td>
                <div class="action-btn-group">
                  <button class="btn-sm" @click="addDays(user, 30)">+30天</button>
                  <button class="btn-sm margin-l" @click="addDays(user, 90)">+90天</button>
                  <button class="btn-sm margin-l" @click="setPermanent(user)">永久授權</button>
                  <button class="btn-link text-red font-bold margin-l" @click="confirmDeleteUser(user)">刪除帳號</button>
                </div>
              </td>
            </tr>
            <tr v-if="userList.length === 0">
              <td colspan="5" class="empty-hint text-center">暫無註冊人員數據</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 區塊二：幫會查看與編輯權限指派 -->
    <div class="admin-section-card margin-t">
      <div class="section-header">
        <h3><i class="mdi mdi-shield-account margin-r"></i> 幫會查看與編輯權限指派</h3>
        <span class="sub-hint">針對各使用者個別配置「可查看」與「可編輯」的幫會權限</span>
      </div>

      <div class="table-container margin-t">
        <table class="admin-table">
          <thead>
            <tr>
              <th width="140">帳號 (ID)</th>
              <th width="130">全局角色</th>
              <th>授權【可查看】幫會 (多選)</th>
              <th>授權【可編輯】幫會 (多選)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in userList" :key="'perm_' + user.id">
              <td class="font-bold">{{ getUserDisplayName(user) }}</td>
              <td>
                <span :class="['role-badge', user.role]">
                  {{ getRoleLabel(user.role) }}
                </span>
              </td>

              <!-- 可查看幫會複選下拉 -->
              <td>
                <div v-if="user.role === 'super_admin'" class="super-admin-hint">
                  <i class="mdi mdi-check-all"></i> 總管理員具備全幫會查看權限
                </div>
                <div v-else class="multi-guild-picker" @click.stop>
                  <div class="picker-trigger" @click="toggleDropdown(user.id, 'view')">
                    <span class="selected-text">{{ getAssignedGuildNames(user.view_guild_ids) }}</span>
                    <i class="mdi mdi-chevron-down"></i>
                  </div>

                  <div v-if="activeDropdownKey === (user.id + '_view')" class="picker-dropdown">
                    <div 
                      v-for="g in allGuilds" 
                      :key="'v_' + g.id" 
                      class="dropdown-checkbox-item"
                      @click="toggleGuildSelection(user, g.id, 'view')"
                    >
                      <input 
                        type="checkbox" 
                        :checked="isGuildInArray(user.view_guild_ids, g.id)" 
                        @click.stop="toggleGuildSelection(user, g.id, 'view')"
                      />
                      <span>{{ g.name }}</span>
                    </div>
                    <div v-if="allGuilds.length === 0" class="empty-hint">暫無幫會資料</div>
                  </div>
                </div>
              </td>

              <!-- 可編輯幫會複選下拉 -->
              <td>
                <div v-if="user.role === 'super_admin'" class="super-admin-hint">
                  <i class="mdi mdi-check-all"></i> 總管理員具備全幫會編輯權限
                </div>
                <div v-else class="multi-guild-picker" @click.stop>
                  <div class="picker-trigger edit-trigger" @click="toggleDropdown(user.id, 'edit')">
                    <span class="selected-text text-green">{{ getAssignedGuildNames(user.edit_guild_ids) }}</span>
                    <i class="mdi mdi-chevron-down"></i>
                  </div>

                  <div v-if="activeDropdownKey === (user.id + '_edit')" class="picker-dropdown">
                    <div 
                      v-for="g in allGuilds" 
                      :key="'e_' + g.id" 
                      class="dropdown-checkbox-item"
                      @click="toggleGuildSelection(user, g.id, 'edit')"
                    >
                      <input 
                        type="checkbox" 
                        :checked="isGuildInArray(user.edit_guild_ids, g.id)" 
                        @click.stop="toggleGuildSelection(user, g.id, 'edit')"
                      />
                      <span>{{ g.name }}</span>
                    </div>
                    <div v-if="allGuilds.length === 0" class="empty-hint">暫無幫會資料</div>
                  </div>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
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
const activeDropdownKey = ref(null)

// 刪除確認 Modal
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

const toggleDropdown = (userId, type) => {
  const key = `${userId}_${type}`
  activeDropdownKey.value = activeDropdownKey.value === key ? null : key
}

const fetchData = async () => {
  // 1. 撈取所有幫會
  const { data: guildsData } = await supabase.from('guilds').select('*').order('created_at', { ascending: true })
  if (guildsData) allGuilds.value = guildsData

  // 2. 撈取使用者 Profile 並相容歷史欄位
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*')
    .order('updated_at', { ascending: false })

  if (profilesData) {
    userList.value = profilesData.map(p => {
      const defaultGuilds = p.guild_ids || (p.guild_id ? [p.guild_id] : [])
      return {
        ...p,
        view_guild_ids: Array.isArray(p.view_guild_ids) && p.view_guild_ids.length > 0 ? p.view_guild_ids : defaultGuilds,
        edit_guild_ids: Array.isArray(p.edit_guild_ids) ? p.edit_guild_ids : (p.role === 'guild_admin' ? defaultGuilds : []),
        status: p.status || '使用中'
      }
    })
  }
}

const getUserDisplayName = (user) => {
  return user.username || (user.email ? user.email.split('@')[0] : user.id.slice(0, 8))
}

const getRoleLabel = (role) => {
  if (role === 'super_admin') return '總管理員'
  if (role === 'guild_admin') return '幫主/統戰'
  return '一般幫眾'
}

const getAssignedGuildNames = (guildIdsArr) => {
  if (!Array.isArray(guildIdsArr) || guildIdsArr.length === 0) return '未指派幫會 (點擊選擇)'
  const names = allGuilds.value
    .filter(g => guildIdsArr.includes(g.id))
    .map(g => g.name)
  return names.length > 0 ? names.join('、') : '未指派幫會 (點擊選擇)'
}

const isGuildInArray = (arr, guildId) => Array.isArray(arr) && arr.includes(guildId)

// 切換「查看」或「編輯」幫會勾選並更新 Supabase
const toggleGuildSelection = async (user, guildId, type) => {
  const targetProp = type === 'view' ? 'view_guild_ids' : 'edit_guild_ids'
  if (!Array.isArray(user[targetProp])) user[targetProp] = []

  const idx = user[targetProp].indexOf(guildId)
  if (idx > -1) {
    user[targetProp].splice(idx, 1)
  } else {
    user[targetProp].push(guildId)
    // 若勾選了可編輯，自動幫其勾選可查看，確保權限一致
    if (type === 'edit' && !user.view_guild_ids.includes(guildId)) {
      user.view_guild_ids.push(guildId)
    }
  }

  const payload = {
    view_guild_ids: user.view_guild_ids,
    edit_guild_ids: user.edit_guild_ids,
    guild_ids: user.view_guild_ids,
    guild_id: user.view_guild_ids[0] || null
  }

  const { error } = await supabase.from('profiles').update(payload).eq('id', user.id)
  if (error) {
    alert('變更幫會權限失敗：' + error.message)
  }
}

const updateUserRole = async (user) => {
  await supabase.from('profiles').update({ role: user.role }).eq('id', user.id)
}

const toggleBanStatus = async (user) => {
  const nextStatus = user.status === '已停權' ? '使用中' : '已停權'
  user.status = nextStatus
  const { error } = await supabase.from('profiles').update({ status: nextStatus }).eq('id', user.id)
  if (error) alert('變更狀態失敗：' + error.message)
}

const addDays = async (user, days) => {
  const current = new Date(user.expire_at < new Date().toISOString() ? new Date() : user.expire_at)
  current.setDate(current.getDate() + days)
  const newExpire = current.toISOString()

  const { error } = await supabase.from('profiles').update({ expire_at: newExpire }).eq('id', user.id)
  if (!error) {
    user.expire_at = newExpire
    alert(`已為【${getUserDisplayName(user)}】延長 ${days} 天！`)
  }
}

const setPermanent = async (user) => {
  const permanentDate = '2099-12-31T23:59:59.000Z'
  const { error } = await supabase.from('profiles').update({ expire_at: permanentDate }).eq('id', user.id)
  if (!error) {
    user.expire_at = permanentDate
    alert(`已為【${getUserDisplayName(user)}】設定永久授權！`)
  }
}

const confirmDeleteUser = (user) => {
  const name = getUserDisplayName(user)
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
  window.addEventListener('click', () => { activeDropdownKey.value = null })
})
</script>

<style scoped>
.admin-dashboard { padding: 20px; background: #f4f6f9; min-height: 85vh; font-size: 13px; }
.admin-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #cbd5e1; padding-bottom: 12px; }
.admin-header h2 { margin: 0; font-size: 16px; color: #1e293b; }

.admin-section-card { background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 18px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.section-header { display: flex; align-items: center; gap: 10px; border-bottom: 1px solid #f1f5f9; padding-bottom: 10px; }
.section-header h3 { margin: 0; font-size: 15px; color: #1e293b; display: flex; align-items: center; }
.count-badge { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold; }
.sub-hint { font-size: 12px; color: #64748b; margin-left: 6px; }

.admin-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
.admin-table th, .admin-table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; vertical-align: middle; }
.admin-table th { background: #f8fafc; color: #475569; font-weight: 600; }

.role-badge { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; display: inline-block; }
.role-badge.super_admin { background: #fee2e2; color: #dc2626; }
.role-badge.guild_admin { background: #e0e7ff; color: #4338ca; }
.role-badge.member { background: #f1f5f9; color: #475569; }

.super-admin-hint { color: #dc2626; font-weight: bold; font-size: 12px; display: flex; align-items: center; gap: 4px; }

/* 多選幫會元件樣式 */
.multi-guild-picker { position: relative; width: 100%; }
.picker-trigger { display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: #ffffff; cursor: pointer; min-height: 20px; }
.picker-trigger.edit-trigger { border-color: #86efac; background: #f0fdf4; }
.selected-text { color: #1d4ed8; font-weight: bold; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 260px; }
.selected-text.text-green { color: #166534; }

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
.select-sm { padding: 4px; border-radius: 4px; border: 1px solid #cbd5e1; outline: none; background: white; }
.btn-link-sm { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }

/* Modal 通用樣式 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 200; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
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
.margin-r { margin-right: 6px; }
.margin-t { margin-top: 12px; }
.font-bold { font-weight: bold; }
.text-red { color: #ef4444; }
.text-center { text-align: center; }
</style>