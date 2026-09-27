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
                <input type="checkbox" v-model="role.tagSwitch" />
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
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const roleCategory = ref('personal')

const personalRoleList = ref([
  { id: 1, name: 'D潮拆塔', desc: '—', tagSwitch: false },
  { id: 2, name: '保鏢拆', desc: '—', tagSwitch: false },
  { id: 3, name: '埋頭猛拆', desc: '—', tagSwitch: false },
  { id: 4, name: '塔仇主T', desc: '—', tagSwitch: false },
  { id: 5, name: '增益絕', desc: '—', tagSwitch: false },
  { id: 6, name: '奶絕', desc: '—', tagSwitch: false },
  { id: 7, name: '指揮', desc: '—', tagSwitch: false },
  { id: 8, name: '清泉人傷', desc: '—', tagSwitch: false },
  { id: 9, name: '清泉保活', desc: '—', tagSwitch: false },
  { id: 10, name: '灌大團', desc: '—', tagSwitch: false },
  { id: 11, name: '點殺', desc: '—', tagSwitch: false },
  { id: 12, name: '燒屍體', desc: '—', tagSwitch: false },
  { id: 13, name: '破甲人傷', desc: '—', tagSwitch: false },
  { id: 14, name: '純保鏢', desc: '—', tagSwitch: false },
  { id: 15, name: '統戰', desc: '—', tagSwitch: false },
  { id: 16, name: '騰龍保鏢', desc: '—', tagSwitch: false },
  { id: 17, name: '騰龍合軸', desc: '—', tagSwitch: false }
])

const squadRoleList = ref([
  { id: 101, name: '保鏢隊', desc: '—', tagSwitch: false },
  { id: 102, name: '雙碎隊', desc: '—', tagSwitch: false },
  { id: 103, name: '雙神隊', desc: '—', tagSwitch: false },
  { id: 104, name: '塔前隊', desc: '—', tagSwitch: false },
  { id: 105, name: '塔後隊', desc: '—', tagSwitch: false },
  { id: 106, name: '請假隊', desc: '—', tagSwitch: false },
  { id: 107, name: '輪空隊', desc: '—', tagSwitch: false }
])

const currentRoleList = computed(() => {
  return roleCategory.value === 'personal' ? personalRoleList.value : squadRoleList.value
})

const dragIndex = ref(null)
const onDragStart = (index) => { dragIndex.value = index }
const onDrop = (targetIndex) => {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const list = currentRoleList.value
  const movedItem = list.splice(dragIndex.value, 1)[0]
  list.splice(targetIndex, 0, movedItem)
  dragIndex.value = null
}

const showRoleModal = ref(false)
const editingRoleId = ref(null)
const roleForm = ref({ name: '', desc: '' })

const openRoleModal = (role = null) => {
  if (role) {
    editingRoleId.value = role.id
    roleForm.value = { ...role }
  } else {
    editingRoleId.value = null
    roleForm.value = { name: '', desc: '' }
  }
  showRoleModal.value = true
}

const saveRole = () => {
  if (!roleForm.value.name.trim()) return alert('請輸入職能名稱！')
  const targetList = currentRoleList.value
  if (editingRoleId.value) {
    const idx = targetList.findIndex(r => r.id === editingRoleId.value)
    if (idx > -1) targetList[idx] = { ...targetList[idx], ...roleForm.value }
  } else {
    targetList.push({ id: Date.now(), name: roleForm.value.name.trim(), desc: roleForm.value.desc.trim(), tagSwitch: false })
  }
  showRoleModal.value = false
}

const deleteRole = (id) => {
  if (confirm('確定要刪除該職能嗎？')) {
    if (roleCategory.value === 'personal') personalRoleList.value = personalRoleList.value.filter(r => r.id !== id)
    else squadRoleList.value = squadRoleList.value.filter(r => r.id !== id)
  }
}
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
.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 20px; }
</style>