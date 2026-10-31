<template>
  <div class="prep-layout light-theme">
    <!-- 全局頂部導航列 -->
    <Navbar
      activeNav="preparation"
      :username="username"
    />

    <!-- 主要內容區 -->
    <div class="prep-main">
      <!-- 左側選單 -->
      <aside class="prep-sidebar">
        <!-- 幫會切換：職能、排表模板、報名問題依幫會分開管理 -->
        <div class="guild-switch">
          <label class="guild-switch-label">目前幫會</label>
          <select v-model="selectedGuildId" class="guild-switch-select" :disabled="accessibleGuildList.length === 0">
            <option v-for="g in accessibleGuildList" :key="g.id" :value="g.id">{{ g.name }}</option>
          </select>
          <span v-if="selectedGuildId && !canEditSelectedGuild" class="guild-readonly-tag">僅可查看</span>
        </div>

        <ul class="sidebar-menu">
          <li :class="{ active: currentTab === 'roles' }" @click="currentTab = 'roles'">職能管理</li>
          <li :class="{ active: currentTab === 'skill' }" @click="currentTab = 'skill'">技能管理</li>
          <li :class="{ active: currentTab === 'template' }" @click="currentTab = 'template'">排表模板</li>
          <li :class="{ active: currentTab === 'faq' }" @click="currentTab = 'faq'">報名問題</li>
        </ul>
      </aside>

      <!-- 右側子組件切換（切換幫會時重新載入） -->
      <main class="content-area">
        <div v-if="!selectedGuildId" class="empty-guild-hint">
          {{ isLoaded ? '尚未擁有任何幫會權限，請聯繫總管理員指派幫會。' : '載入中...' }}
        </div>
        <template v-else>
          <RoleManagement v-if="currentTab === 'roles'" :key="'roles_' + selectedGuildId" :guildId="selectedGuildId" />
          <SkillManagement v-else-if="currentTab === 'skill'" :key="'skill_' + selectedGuildId" :guildId="selectedGuildId" />
          <LineupTemplate v-else-if="currentTab === 'template'" :key="'tpl_' + selectedGuildId" :guildId="selectedGuildId" :canEdit="canEditSelectedGuild" />
          <QuestionConfig v-else-if="currentTab === 'faq'" :key="'faq_' + selectedGuildId" :guildId="selectedGuildId" :canEdit="canEditSelectedGuild" />
        </template>
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../utils/supabase'
import Navbar from '../components/layout/Navbar.vue'
import RoleManagement from './preparation/RoleManagement.vue'
import SkillManagement from './preparation/SkillManagement.vue'
import LineupTemplate from './preparation/LineupTemplate.vue'
import QuestionConfig from './preparation/QuestionConfig.vue'

const GUILD_STORAGE_KEY = 'prep_selected_guild_id'

const username = ref('')
const currentTab = ref('roles')
const userProfile = ref(null)
const allGuilds = ref([])
const selectedGuildId = ref(null)
const isLoaded = ref(false)

// 與成員頁一致：可查看＋可編輯的幫會
const accessibleGuildList = computed(() => {
  if (!userProfile.value) return []
  if (userProfile.value.role === 'super_admin') return allGuilds.value
  const viewIds = userProfile.value.view_guild_ids || userProfile.value.guild_ids || (userProfile.value.guild_id ? [userProfile.value.guild_id] : [])
  const editIds = userProfile.value.edit_guild_ids || []
  const ids = new Set([...viewIds, ...editIds])
  return allGuilds.value.filter(g => ids.has(g.id))
})

const canEditSelectedGuild = computed(() => {
  if (!userProfile.value || !selectedGuildId.value) return false
  if (userProfile.value.role === 'super_admin') return true
  return (userProfile.value.edit_guild_ids || []).includes(selectedGuildId.value)
})

const readStoredGuildId = () => {
  try { return localStorage.getItem(GUILD_STORAGE_KEY) } catch { return null }
}

watch(selectedGuildId, (id) => {
  try { if (id) localStorage.setItem(GUILD_STORAGE_KEY, id) } catch { /* 無法使用瀏覽器儲存時略過 */ }
})

const loadPage = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return // 未登入由路由守衛導向登入頁
  username.value = session.user.email.split('@')[0]

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle()
  userProfile.value = profile

  const { data: guildsData } = await supabase.from('guilds').select('*').order('created_at', { ascending: true })
  allGuilds.value = guildsData || []

  // 優先使用上次選擇的幫會，否則選第一個有編輯權的，再不然選第一個可查看的
  const list = accessibleGuildList.value
  const stored = readStoredGuildId()
  const firstEditable = list.find(g => (profile?.role === 'super_admin') || (profile?.edit_guild_ids || []).includes(g.id))
  selectedGuildId.value = list.find(g => g.id === stored)?.id || firstEditable?.id || list[0]?.id || null
  isLoaded.value = true
}

onMounted(loadPage)
</script>

<style scoped>
.prep-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.light-theme { background-color: #f4f6f9; color: #2c3e50; }

.prep-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }
.prep-sidebar { width: 180px; background: #ffffff; border-radius: 8px; padding: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-menu { list-style: none; padding: 0; margin: 0; }
.sidebar-menu li { padding: 12px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 4px; color: #64748b; transition: all 0.2s; }
.sidebar-menu li.active, .sidebar-menu li:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }

.guild-switch { padding: 6px 6px 12px; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; }
.guild-switch-label { display: block; font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
.guild-switch-select { width: 100%; padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 6px; font-size: 13px; color: #1e293b; background: #fff; }
.guild-readonly-tag { display: inline-block; margin-top: 6px; font-size: 11px; color: #b45309; background: #fef3c7; padding: 1px 6px; border-radius: 4px; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.empty-guild-hint { color: #94a3b8; font-size: 13px; padding: 40px 0; text-align: center; }
</style>
