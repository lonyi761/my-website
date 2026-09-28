<template>
  <div class="admin-dashboard">
    <div class="admin-header">
      <h2>總管理員控制台 - 用戶帳號綁定與授權管理</h2>
      <button class="btn-secondary" @click="$emit('back')">返回聯賽排表</button>
    </div>

    <div class="table-container margin-t">
      <table class="admin-table">
        <thead>
          <tr>
            <th>帳號 (ID)</th>
            <th>角色權限</th>
            <th>指派所屬幫會</th>
            <th>到期時間</th>
            <th>狀態</th>
            <th>授權天數操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in userList" :key="user.id">
            <td class="font-bold">{{ user.username || user.email.split('@')[0] }}</td>
            
            <!-- 變更權限角色 -->
            <td>
              <select v-model="user.role" @change="updateUserRole(user)" class="select-sm">
                <option value="member">一般幫眾</option>
                <option value="guild_admin">幫主/統戰</option>
                <option value="super_admin">總管理員</option>
              </select>
            </td>

            <!-- 管理員幫會綁定下拉選單 -->
            <td>
              <select 
                :value="user.guild_id || ''" 
                @change="updateUserGuild(user, $event.target.value)" 
                class="select-sm guild-select"
              >
                <option value="">未指派幫會</option>
                <option v-for="g in allGuilds" :key="g.id" :value="g.id">
                  {{ g.name }}
                </option>
              </select>
            </td>

            <td>{{ formatDate(user.expire_at) }}</td>

            <td>
              <span :class="['status-tag', isExpired(user.expire_at) ? 'expired' : 'active']">
                {{ isExpired(user.expire_at) ? '已到期' : '使用中' }}
              </span>
            </td>

            <td>
              <button class="btn-sm" @click="addDays(user, 30)">+30天</button>
              <button class="btn-sm margin-l" @click="addDays(user, 90)">+90天</button>
              <button class="btn-sm margin-l" @click="setPermanent(user)">永久授權</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../utils/supabase'

defineEmits(['back'])

const userList = ref([])
const allGuilds = ref([])

// 拉取所有用戶 Profiles 與全部幫會清單
const fetchData = async () => {
  // 1. 撈取幫會選項
  const { data: guildsData } = await supabase.from('guilds').select('*')
  if (guildsData) allGuilds.value = guildsData

  // 2. 撈取使用者 Profile
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('*, guilds(*)')
    .order('updated_at', { ascending: false })
  if (profilesData) userList.value = profilesData
}

const formatDate = (dateStr) => {
  if (!dateStr) return '—'
  return dateStr.split('T')[0]
}

const isExpired = (expireAt) => {
  return new Date(expireAt) < new Date()
}

// 指派/綁定使用者所屬幫會
const updateUserGuild = async (user, newGuildId) => {
  const guildVal = newGuildId || null
  const { error } = await supabase
    .from('profiles')
    .update({ guild_id: guildVal })
    .eq('id', user.id)

  if (!error) {
    user.guild_id = guildVal
    alert(`成功將帳號【${user.username || user.email.split('@')[0]}】綁定至新幫會！`)
  } else {
    alert('變更幫會失敗：' + error.message)
  }
}

// 變更權限角色
const updateUserRole = async (user) => {
  await supabase
    .from('profiles')
    .update({ role: user.role })
    .eq('id', user.id)
}

// 延長授權天數
const addDays = async (user, days) => {
  const current = new Date(user.expire_at < new Date().toISOString() ? new Date() : user.expire_at)
  current.setDate(current.getDate() + days)
  const newExpire = current.toISOString()

  const { error } = await supabase
    .from('profiles')
    .update({ expire_at: newExpire })
    .eq('id', user.id)

  if (!error) {
    user.expire_at = newExpire
    alert(`已為【${user.username || user.email.split('@')[0]}】延長 ${days} 天！`)
  }
}

// 設定永久授權
const setPermanent = async (user) => {
  const permanentDate = '2099-12-31T23:59:59.000Z'
  const { error } = await supabase
    .from('profiles')
    .update({ expire_at: permanentDate })
    .eq('id', user.id)

  if (!error) {
    user.expire_at = permanentDate
    alert(`已為【${user.username || user.email.split('@')[0]}】設定永久授權！`)
  }
}

onMounted(fetchData)
</script>

<style scoped>
.admin-dashboard { padding: 20px; background: #ffffff; min-height: 80vh; font-size: 13px; }
.admin-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
.admin-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
.admin-table th, .admin-table td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; }
.admin-table th { background: #f8fafc; color: #475569; }
.status-tag.active { background: #d1fae5; color: #047857; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.status-tag.expired { background: #fee2e2; color: #b91c1c; padding: 2px 8px; border-radius: 4px; font-size: 11px; }
.btn-sm { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; }
.btn-secondary { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.select-sm { padding: 4px; border-radius: 4px; border: 1px solid #cbd5e1; }
.guild-select { font-weight: bold; color: #1d4ed8; }
.margin-l { margin-left: 6px; }
.font-bold { font-weight: bold; }
</style>