<template>
  <div class="role-management">
    <div class="prep-header">
      <h2>職能管理</h2>
      <p class="sub-notice">
        按個人職能、小隊職能分別維護選項表，互不混用。拖動最左側圖示可保存當前類型內的順序。
      </p>
    </div>

    <div class="toolbar">
      <div class="sub-tabs">
        <button :class="['sub-tab-btn', { active: roleCategory === 'personal' }]" @click="roleCategory = 'personal'">個人職能</button>
        <button :class="['sub-tab-btn', { active: roleCategory === 'squad' }]" @click="roleCategory = 'squad'">小隊職能</button>
      </div>

      <div class="right-actions">
        <button class="btn-primary" @click="openRoleModal()">
          + 新增{{ roleCategory === 'personal' ? '個人' : '小隊' }}職能
        </button>
      </div>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th width="40"></th>
            <th>職能名稱</th>
            <th>描述</th>
            <th width="100">標籤開關</th>
            <th width="110">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(role, index) in currentRoleList" 
            :key="role.id"
            draggable="true"
            @dragstart="onDragStart(index)"
            @dragover.prevent
            @drop="onDrop(index)"
            :class="{ 'dragging-row': dragIndex === index }"
          >
            <td>
              <div class="drag-handle-cell" title="按住拖曳上下拉動排序">
                <span class="drag-icon">☰</span>
              </div>
            </td>
            <td class="font-bold">{{ role.name }}</td>
            <td>{{ role.desc || '—' }}</td>
            <td>
              <label class="switch">
                <input type="checkbox" v-model="role.tagSwitch" @change="toggleTagSwitch(role)" />
                <span class="slider"></span>
              </label>
            </td>
            <td>
              <button class="btn-link" @click="openRoleModal(role)">編輯</button>
              <button class="btn-link text-red margin-l" @click="deleteRole(role.id)">刪除</button>
            </td>
          </tr>
          <tr v-if="currentRoleList.length === 0">
            <td colspan="5" class="empty-cell">暫無職能資料</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 職能 Modal -->
    <div v-if="showRoleModal" class="modal-overlay" @click.self="showRoleModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>{{ editingRoleId ? '編輯職能' : '新增職能' }}</h3>
          <span class="close-btn" @click="showRoleModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label><span class="req">*</span>職能名稱：</label>
            <input type="text" v-model="roleForm.name" placeholder="請輸入職能名稱" />
          </div>
          <div class="form-row">
            <label>描述：</label>
            <input type="text" v-model="roleForm.desc" placeholder="請輸入描述" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showRoleModal = false">取消</button>
          <button class="btn-primary" @click="saveRole">確定</button>
        </div>
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
          <button class="btn-primary btn-red" @click="executeConfirmAction">刪除</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../../utils/supabase'

const roleCategory = ref('personal')
const currentGuildId = ref(null)

// 預設 13 項個人職能
const DEFAULT_PERSONAL_ROLES = [
  '保鑣', '埋頭猛拆', '塔仇御鐵', '潮砲', '奶絕奶',
  '增益奶', '輔潮', '燒屍體', '騰龍合軸', '拆塔指揮',
  '保鑣指揮', '防守指揮', '點殺'
]

// 預設 5 項小隊職能
const DEFAULT_SQUAD_ROLES = [
  '保鑣隊', '拆塔隊', '塔前隊', '塔後隊', '防守隊'
]

const personalRoleList = ref([])
const squadRoleList = ref([])

// 置中刪除確認 Modal
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

// 取得當前幫會 ID（具備強效自動相容 Fallback）
const fetchCurrentGuild = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (profile) {
      if (profile.guild_id) return profile.guild_id
      if (profile.guild_ids && profile.guild_ids.length > 0) return profile.guild_ids[0]
    }

    // 容錯：若 profile 沒設定幫會，自動拉取第一筆幫會
    const { data: guilds } = await supabase.from('guilds').select('id').limit(1)
    if (guilds && guilds.length > 0) return guilds[0].id
  } catch (e) {
    console.warn('獲取幫會資訊失敗:', e)
  }
  return null
}

// 載入職能資料並初始化預設選項
const loadRolesFromDB = async () => {
  const gId = await fetchCurrentGuild()
  currentGuildId.value = gId

  if (!gId) {
    initDefaultState()
    return
  }

  const { data, error } = await supabase
    .from('preparation_roles')
    .select('*')
    .eq('guild_id', gId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.error('查詢 preparation_roles 失敗，可能未建立資料庫:', error)
    initDefaultState()
    return
  }

  const dbPersonal = (data || []).filter(r => r.type === 'personal')
  const dbSquad = (data || []).filter(r => r.type === 'squad')

  // 若個人職能無紀錄，自動寫入預設值至 DB
  if (dbPersonal.length === 0) {
    const initPersonal = DEFAULT_PERSONAL_ROLES.map((name, idx) => ({
      guild_id: gId,
      name,
      type: 'personal',
      description: '—',
      is_enabled: true,
      sort_order: idx + 1
    }))
    await supabase.from('preparation_roles').insert(initPersonal)
  }

  // 若小隊職能無紀錄，自動寫入預設值至 DB
  if (dbSquad.length === 0) {
    const initSquad = DEFAULT_SQUAD_ROLES.map((name, idx) => ({
      guild_id: gId,
      name,
      type: 'squad',
      description: '—',
      is_enabled: true,
      sort_order: idx + 1
    }))
    await supabase.from('preparation_roles').insert(initSquad)
  }

  // 重新從 DB 拉取最新列表（取得真正的資料庫 UUID）
  const { data: latestData } = await supabase
    .from('preparation_roles')
    .select('*')
    .eq('guild_id', gId)
    .order('sort_order', { ascending: true })

  if (latestData && latestData.length > 0) {
    personalRoleList.value = latestData.filter(r => r.type === 'personal').map(r => ({
      id: r.id,
      name: r.name,
      desc: r.description || '—',
      tagSwitch: r.is_enabled !== false,
      sortOrder: r.sort_order
    }))

    squadRoleList.value = latestData.filter(r => r.type === 'squad').map(r => ({
      id: r.id,
      name: r.name,
      desc: r.description || '—',
      tagSwitch: r.is_enabled !== false,
      sortOrder: r.sort_order
    }))
  } else {
    initDefaultState()
  }
}

const initDefaultState = () => {
  personalRoleList.value = DEFAULT_PERSONAL_ROLES.map((name, idx) => ({
    id: `def_p_${idx}`, name, desc: '—', tagSwitch: true, sortOrder: idx + 1
  }))
  squadRoleList.value = DEFAULT_SQUAD_ROLES.map((name, idx) => ({
    id: `def_s_${idx}`, name, desc: '—', tagSwitch: true, sortOrder: idx + 1
  }))
}

const currentRoleList = computed(() => {
  return roleCategory.value === 'personal' ? personalRoleList.value : squadRoleList.value
})

// 拖拽排序
const dragIndex = ref(null)
const onDragStart = (index) => { dragIndex.value = index }
const onDrop = async (targetIndex) => {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const list = currentRoleList.value
  const movedItem = list.splice(dragIndex.value, 1)[0]
  list.splice(targetIndex, 0, movedItem)
  dragIndex.value = null

  if (currentGuildId.value) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      if (item.id && !String(item.id).startsWith('def_')) {
        await supabase.from('preparation_roles').update({ sort_order: i + 1 }).eq('id', item.id)
      }
    }
  }
}

const toggleTagSwitch = async (role) => {
  if (role.id && !String(role.id).startsWith('def_')) {
    await supabase.from('preparation_roles').update({ is_enabled: role.tagSwitch }).eq('id', role.id)
  }
}

const showRoleModal = ref(false)
const editingRoleId = ref(null)
const roleForm = ref({ name: '', desc: '' })

const openRoleModal = (role = null) => {
  if (role) {
    editingRoleId.value = role.id
    roleForm.value = { name: role.name, desc: role.desc === '—' ? '' : role.desc }
  } else {
    editingRoleId.value = null
    roleForm.value = { name: '', desc: '' }
  }
  showRoleModal.value = true
}

// 確定保存（寫入 Supabase 並檢測 SQL 錯誤）
const saveRole = async () => {
  const name = roleForm.value.name.trim()
  if (!name) return alert('請輸入職能名稱！')
  const desc = roleForm.value.desc.trim() || '—'

  const gId = currentGuildId.value || await fetchCurrentGuild()

  if (!gId) {
    alert('尚無可用的幫會，請先在「成員」頁面新增或選擇幫會！')
    return
  }

  if (editingRoleId.value && !String(editingRoleId.value).startsWith('def_')) {
    // 編輯已有資料
    const { error } = await supabase
      .from('preparation_roles')
      .update({ name, description: desc })
      .eq('id', editingRoleId.value)

    if (error) {
      alert('更新失敗，請確認 SQL 資料庫是否正確建立：' + error.message)
      return
    }
  } else {
    // 新增資料
    const list = currentRoleList.value
    const { error } = await supabase
      .from('preparation_roles')
      .insert([{
        guild_id: gId,
        type: roleCategory.value,
        name,
        description: desc,
        is_enabled: true,
        sort_order: list.length + 1
      }])

    if (error) {
      alert('新增失敗！請確認 Supabase 中已建立 preparation_roles 資料表：\n' + error.message)
      return
    }
  }

  showRoleModal.value = false
  await loadRolesFromDB() // 重新載入最新雲端資料
}

const deleteRole = (id) => {
  const list = currentRoleList.value
  const target = list.find(r => r.id === id)
  const targetName = target ? target.name : ''
  const categoryName = roleCategory.value === 'personal' ? '個人職能' : '小隊職能'

  triggerConfirmModal(
    `刪除${categoryName}`,
    `確定要刪除${categoryName}「${targetName}」嗎？刪除後無法恢復。`,
    async () => {
      if (id && !String(id).startsWith('def_')) {
        const { error } = await supabase.from('preparation_roles').delete().eq('id', id)
        if (error) {
          alert('刪除失敗：' + error.message)
          return
        }
      }
      await loadRolesFromDB()
    }
  )
}

onMounted(loadRolesFromDB)
</script>

<style scoped>
.prep-header h2 { margin: 0 0 8px 0; font-size: 16px; }
.sub-notice { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #3b82f6; }
.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sub-tabs { display: flex; gap: 15px; border-bottom: 1px solid #e2e8f0; }
.sub-tab-btn { background: none; border: none; padding: 8px 4px; font-size: 13px; cursor: pointer; color: #64748b; position: relative; }
.sub-tab-btn.active { color: #2563eb; font-weight: bold; }
.sub-tab-btn.active::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: #2563eb; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-primary.btn-red { background: #ef4444; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }
.margin-l { margin-left: 10px; }
.font-bold { font-weight: bold; }
.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }
.data-table tr[draggable="true"] { cursor: grab; }
.data-table tr.dragging-row { opacity: 0.4; background: #f1f5f9; }
.drag-handle-cell { display: flex; align-items: center; justify-content: center; color: #64748b; user-select: none; }
.drag-icon { font-size: 16px; color: #94a3b8; }

.switch { position: relative; display: inline-block; width: 34px; height: 18px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 18px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(16px); }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.small-card { width: 380px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row label { width: 80px; font-weight: bold; }
.form-row input[type="text"] { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
.req { color: #ef4444; }

/* 置中刪除確認 Modal */
.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 20px; }
</style>