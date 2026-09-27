<template>
  <div class="skill-management">
    <div class="prep-header">
      <div class="header-with-btn">
        <h2>技能管理</h2>
        <button class="btn-primary" @click="openSkillModal()">+ 新增技能</button>
      </div>
      <p class="sub-notice">
        按 <strong>絕技 / 群俠百家 / 流派技能</strong> 三類分別維護本用戶組的技能詞條；這裡維護的內容會作為成員彈窗、排表批量編輯等位置的下拉候選。切換頁籤互不影響，每條記錄在同組同類型下按內容唯一去重。
      </p>
    </div>

    <div class="sub-tabs margin-b">
      <button :class="['sub-tab-btn', { active: skillCategory === 'jueji' }]" @click="skillCategory = 'jueji'">絕技</button>
      <button :class="['sub-tab-btn', { active: skillCategory === 'qunxia' }]" @click="skillCategory = 'qunxia'">群俠百家</button>
      <button :class="['sub-tab-btn', { active: skillCategory === 'liupai' }]" @click="skillCategory = 'liupai'">流派技能</button>
    </div>

    <div class="filter-bar">
      <div class="search-input-wrapper">
        <i class="mdi mdi-magnify search-icon"></i>
        <input type="text" v-model="searchSkillQuery" placeholder="搜尋內容關鍵詞" class="filter-search-input" />
      </div>
      <span class="count-text">共 {{ filteredSkillList.length }} 條</span>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th width="40"></th>
            <th>內容</th>
            <th width="180">創建時間</th>
            <th width="180">最近使用</th>
            <th width="110">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(item, idx) in filteredSkillList" 
            :key="item.id"
            draggable="true"
            @dragstart="onSkillDragStart(idx)"
            @dragover.prevent
            @drop="onSkillDrop(idx)"
            :class="{ 'dragging-row': skillDragIndex === idx }"
          >
            <td>
              <div class="drag-handle-cell" title="按住拖曳上下拉動排序">
                <span class="drag-icon">☰</span>
              </div>
            </td>
            <td class="font-bold">{{ item.content }}</td>
            <td class="text-gray">{{ item.createdAt }}</td>
            <td class="text-gray">{{ item.lastUsed }}</td>
            <td>
              <button class="btn-link" @click="openSkillModal(item)">編輯</button>
              <button class="btn-link text-red margin-l" @click="deleteSkill(item.id)">刪除</button>
            </td>
          </tr>
          <tr v-if="filteredSkillList.length === 0">
            <td colspan="5" class="empty-cell">暫無數據，可點右上角「新增技能」添加</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 技能 Modal -->
    <div v-if="showSkillModal" class="modal-overlay" @click.self="showSkillModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>{{ editingSkillId ? '編輯技能' : '新增技能' }}</h3>
          <span class="close-btn" @click="showSkillModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row align-start">
            <label>類型：</label>
            <div class="type-value-group">
              <span class="type-badge-btn">{{ skillCategoryLabel }}</span>
              <span class="type-hint-text">類型由當前頁籤決定，不可在此處修改</span>
            </div>
          </div>
          <div class="form-row align-start margin-t">
            <label><span class="req">*</span>內容：</label>
            <div class="textarea-wrapper">
              <textarea 
                v-model="skillForm.content" 
                maxlength="20" 
                placeholder="請輸入技能內容，最長 20 字" 
                class="skill-textarea"
              ></textarea>
              <span class="char-counter">{{ skillForm.content.length }} / 20</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showSkillModal = false">取消</button>
          <button class="btn-primary" @click="saveSkill">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const skillCategory = ref('jueji')
const searchSkillQuery = ref('')

const juejiSkillList = ref([
  { id: 1, content: '狂發一怒', createdAt: '2026-09-28 00:30', lastUsed: '2026-09-28 00:30' },
  { id: 2, content: '太極圖', createdAt: '2026-09-28 00:30', lastUsed: '2026-09-28 00:30' }
])

const qunxiaSkillList = ref([
  { id: 101, content: '咚咚跳台', createdAt: '2026-09-28 00:30', lastUsed: '2026-09-28 00:30' },
  { id: 102, content: '雲影濁香', createdAt: '2026-09-28 00:30', lastUsed: '2026-09-28 00:30' }
])

const liupaiSkillList = ref([
  { id: 201, content: '約定', createdAt: '2026-09-28 00:30', lastUsed: '2026-09-28 00:30' },
  { id: 202, content: '清泉', createdAt: '2026-09-28 00:30', lastUsed: '2026-09-28 00:30' }
])

const currentSkillList = computed(() => {
  if (skillCategory.value === 'jueji') return juejiSkillList.value
  if (skillCategory.value === 'qunxia') return qunxiaSkillList.value
  return liupaiSkillList.value
})

const filteredSkillList = computed(() => {
  if (!searchSkillQuery.value.trim()) return currentSkillList.value
  return currentSkillList.value.filter(s => s.content.toLowerCase().includes(searchSkillQuery.value.toLowerCase().trim()))
})

const skillCategoryLabel = computed(() => {
  if (skillCategory.value === 'jueji') return '絕技'
  if (skillCategory.value === 'qunxia') return '群俠百家'
  return '流派技能'
})

const skillDragIndex = ref(null)
const onSkillDragStart = (index) => { skillDragIndex.value = index }
const onSkillDrop = (targetIndex) => {
  if (skillDragIndex.value === null || skillDragIndex.value === targetIndex) return
  const list = currentSkillList.value
  const movedItem = list.splice(skillDragIndex.value, 1)[0]
  list.splice(targetIndex, 0, movedItem)
  skillDragIndex.value = null
}

const showSkillModal = ref(false)
const editingSkillId = ref(null)
const skillForm = ref({ content: '' })

const openSkillModal = (item = null) => {
  if (item) {
    editingSkillId.value = item.id
    skillForm.value = { content: item.content }
  } else {
    editingSkillId.value = null
    skillForm.value = { content: '' }
  }
  showSkillModal.value = true
}

const saveSkill = () => {
  const content = skillForm.value.content.trim()
  if (!content) return alert('請輸入技能內容！')

  const nowStr = '2026-09-28 00:30'
  const targetList = currentSkillList.value

  if (editingSkillId.value) {
    const idx = targetList.findIndex(s => s.id === editingSkillId.value)
    if (idx > -1) {
      targetList[idx].content = content
      targetList[idx].lastUsed = nowStr
    }
  } else {
    targetList.unshift({
      id: Date.now(),
      content,
      createdAt: nowStr,
      lastUsed: nowStr
    })
  }
  showSkillModal.value = false
}

const deleteSkill = (id) => {
  if (confirm('確定要刪除該技能嗎？')) {
    if (skillCategory.value === 'jueji') juejiSkillList.value = juejiSkillList.value.filter(s => s.id !== id)
    else if (skillCategory.value === 'qunxia') qunxiaSkillList.value = qunxiaSkillList.value.filter(s => s.id !== id)
    else liupaiSkillList.value = liupaiSkillList.value.filter(s => s.id !== id)
  }
}
</script>

<style scoped>
.prep-header h2 { margin: 0; }
.header-with-btn { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.sub-notice { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #3b82f6; }
.sub-tabs { display: flex; gap: 15px; border-bottom: 1px solid #e2e8f0; }
.sub-tab-btn { background: none; border: none; padding: 8px 4px; font-size: 13px; cursor: pointer; color: #64748b; position: relative; }
.sub-tab-btn.active { color: #2563eb; font-weight: bold; }
.sub-tab-btn.active::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: #2563eb; }

.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
.search-input-wrapper { position: relative; width: 220px; display: flex; align-items: center; }
.search-icon { position: absolute; left: 8px; color: #94a3b8; font-size: 16px; }
.filter-search-input { width: 100%; padding: 6px 12px 6px 28px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; }
.count-text { font-size: 12px; color: #64748b; }
.text-gray { color: #64748b; }
.font-bold { font-weight: bold; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }
.margin-l { margin-left: 10px; }
.margin-b { margin-bottom: 15px; }
.margin-t { margin-top: 10px; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }
.data-table tr[draggable="true"] { cursor: grab; }
.data-table tr.dragging-row { opacity: 0.4; background: #f1f5f9; }
.drag-handle-cell { display: flex; align-items: center; justify-content: center; color: #64748b; user-select: none; }
.drag-icon { font-size: 16px; color: #94a3b8; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.medium-card { width: 480px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row.align-start { align-items: flex-start; }
.form-row label { width: 80px; font-weight: bold; }
.req { color: #ef4444; }

.type-value-group { display: flex; align-items: center; gap: 8px; flex: 1; }
.type-badge-btn { border: 1px solid #cbd5e1; background: #ffffff; padding: 2px 12px; border-radius: 6px; font-size: 12px; color: #334155; }
.type-hint-text { font-size: 12px; color: #94a3b8; }

.textarea-wrapper { position: relative; flex: 1; display: flex; flex-direction: column; }
.skill-textarea { width: 100%; height: 80px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; resize: none; box-sizing: border-box; outline: none; }
.char-counter { position: absolute; right: 10px; bottom: 8px; font-size: 11px; color: #94a3b8; pointer-events: none; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }
</style>