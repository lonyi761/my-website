<template>
  <div class="question-config">
    <div class="prep-header">
      <div class="header-with-btn">
        <h2>報名問題</h2>
        <button class="btn-primary" @click="openQuestionModal()">+ 新增報名問題</button>
      </div>
      <p class="sub-notice">
        維護本戶組供成員報名的表格問題，拖動左側圖標調整順序，成員報名頁面將看到這些題目。
      </p>
    </div>

    <div class="table-container">
      <table class="data-table">
        <thead>
          <tr>
            <th width="40"></th>
            <th>題幹</th>
            <th width="100">題型</th>
            <th>選項 / 提示</th>
            <th width="80">必填</th>
            <th width="110">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr 
            v-for="(q, idx) in questionList" 
            :key="q.id"
            draggable="true"
            @dragstart="onQuestionDragStart(idx)"
            @dragover.prevent
            @drop="onQuestionDrop(idx)"
            :class="{ 'dragging-row': questionDragIndex === idx }"
          >
            <td>
              <div class="drag-handle-cell" title="按住拖曳上下拉動排序">
                <span class="drag-icon">☰</span>
              </div>
            </td>
            <td class="font-bold">{{ q.title }}</td>
            <td>
              <span class="type-badge">{{ getQuestionTypeLabel(q.type) }}</span>
            </td>
            <td>
              <span v-if="q.type === 'text'" class="text-gray">{{ q.placeholder || '—' }}</span>
              <span v-else>{{ q.options.join(' / ') || '—' }}</span>
            </td>
            <td>{{ q.is_required ? '是' : '否' }}</td>
            <td>
              <button class="btn-link" @click="openQuestionModal(q)">編輯</button>
              <button class="btn-link text-red margin-l" @click="deleteQuestion(q.id)">刪除</button>
            </td>
          </tr>
          <tr v-if="questionList.length === 0">
            <td colspan="6" class="empty-cell">暫無報名問題數據，可點右上角「新增報名問題」添加</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 報名問題 Modal -->
    <div v-if="showQuestionModal" class="modal-overlay" @click.self="showQuestionModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>{{ editingQuestionId ? '編輯報名問題' : '新增報名問題' }}</h3>
          <span class="close-btn" @click="showQuestionModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row align-start">
            <label><span class="req">*</span>題幹：</label>
            <div class="input-with-counter">
              <input 
                type="text" 
                v-model="questionForm.title" 
                maxlength="200" 
                placeholder="成員端看到的問題" 
                class="counter-input"
              />
              <span class="input-char-counter">{{ questionForm.title.length }} / 200</span>
            </div>
          </div>

          <div class="form-row margin-t">
            <label><span class="req">*</span>題型：</label>
            <div class="type-btn-group">
              <button :class="['type-btn', { active: questionForm.type === 'radio' }]" @click="questionForm.type = 'radio'">單選</button>
              <button :class="['type-btn', { active: questionForm.type === 'checkbox' }]" @click="questionForm.type = 'checkbox'">多選</button>
              <button :class="['type-btn', { active: questionForm.type === 'text' }]" @click="questionForm.type = 'text'">文本</button>
            </div>
          </div>

          <div v-if="questionForm.type !== 'text'" class="form-row align-start margin-t">
            <label><span class="req">*</span>選項：</label>
            <div class="options-container">
              <div v-for="(opt, idx) in questionForm.options" :key="idx" class="option-row">
                <input type="text" v-model="questionForm.options[idx]" class="option-input" placeholder="請輸入選項" />
                <button class="btn-link text-red" @click="questionForm.options.splice(idx, 1)">刪除</button>
              </div>
              <button class="add-option-btn" @click="questionForm.options.push('')">添加選項</button>
            </div>
          </div>

          <div v-else class="form-row align-start margin-t">
            <label>占位提示：</label>
            <div class="input-with-counter">
              <input 
                type="text" 
                v-model="questionForm.placeholder" 
                maxlength="200" 
                placeholder="成員端輸入框提示 (選填)" 
                class="counter-input"
              />
              <span class="input-char-counter">{{ questionForm.placeholder.length }} / 200</span>
            </div>
          </div>

          <div class="form-row margin-t">
            <label>必填：</label>
            <label class="switch">
              <input type="checkbox" v-model="questionForm.is_required" />
              <span class="slider"></span>
            </label>
          </div>

          <div class="form-row margin-t">
            <label>排序：</label>
            <div class="sort-input-group">
              <input type="number" v-model.number="questionForm.sort_order" class="sort-num-input" />
              <span class="type-hint-text margin-l">也可在列表中拖動調整順序</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showQuestionModal = false">取消</button>
          <button class="btn-primary" @click="saveQuestion">保存</button>
        </div>
      </div>
    </div>

    <!-- 置中刪除確認 Modal (圖四對應) -->
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
import { ref } from 'vue'

const questionList = ref([
  { id: 1, title: '本場聯賽開車', type: 'radio', options: ['能', '不能'], placeholder: '', is_required: true, sort_order: 1 },
  { id: 2, title: '本場聯賽保車', type: 'radio', options: ['能', '不能'], placeholder: '', is_required: true, sort_order: 2 }
])

// 美化置中刪除確認 Modal 狀態
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

const questionDragIndex = ref(null)
const onQuestionDragStart = (index) => { questionDragIndex.value = index }
const onQuestionDrop = (targetIndex) => {
  if (questionDragIndex.value === null || questionDragIndex.value === targetIndex) return
  const movedItem = questionList.value.splice(questionDragIndex.value, 1)[0]
  questionList.value.splice(targetIndex, 0, movedItem)
  questionDragIndex.value = null
}

const showQuestionModal = ref(false)
const editingQuestionId = ref(null)
const questionForm = ref({
  title: '',
  type: 'radio',
  options: ['能', '不能'],
  placeholder: '',
  is_required: true,
  sort_order: 1
})

const getQuestionTypeLabel = (type) => {
  if (type === 'radio') return '單選'
  if (type === 'checkbox') return '多選'
  return '文本'
}

const openQuestionModal = (q = null) => {
  if (q) {
    editingQuestionId.value = q.id
    questionForm.value = {
      title: q.title,
      type: q.type,
      options: [...q.options],
      placeholder: q.placeholder || '',
      is_required: q.is_required,
      sort_order: q.sort_order
    }
  } else {
    editingQuestionId.value = null
    questionForm.value = {
      title: '',
      type: 'radio',
      options: ['能', '不能'],
      placeholder: '',
      is_required: true,
      sort_order: questionList.value.length + 1
    }
  }
  showQuestionModal.value = true
}

const saveQuestion = () => {
  const title = questionForm.value.title.trim()
  if (!title) return alert('請輸入題幹！')

  if (questionForm.value.type !== 'text' && questionForm.value.options.length === 0) {
    return alert('請至少新增一個選項！')
  }

  const cleanOptions = questionForm.value.options.map(s => s.trim()).filter(Boolean)

  if (editingQuestionId.value) {
    const idx = questionList.value.findIndex(q => q.id === editingQuestionId.value)
    if (idx > -1) {
      questionList.value[idx] = {
        ...questionForm.value,
        title,
        options: cleanOptions,
        id: editingQuestionId.value
      }
    }
  } else {
    questionList.value.unshift({
      id: Date.now(),
      title,
      type: questionForm.value.type,
      options: cleanOptions,
      placeholder: questionForm.value.placeholder.trim(),
      is_required: questionForm.value.is_required,
      sort_order: questionForm.value.sort_order
    })
  }
  showQuestionModal.value = false
}

const deleteQuestion = (id) => {
  const q = questionList.value.find(item => item.id === id)
  const qTitle = q ? q.title : ''
  triggerConfirmModal(
    '刪除報名問題',
    `確定要刪除問題「${qTitle}」嗎？刪除後無法恢復。`,
    () => {
      questionList.value = questionList.value.filter(q => q.id !== id)
    }
  )
}
</script>

<style scoped>
.prep-header h2 { margin: 0; }
.header-with-btn { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.sub-notice { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #3b82f6; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-primary.btn-red { background: #ef4444; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }
.text-gray { color: #64748b; }
.font-bold { font-weight: bold; }
.margin-l { margin-left: 10px; }
.margin-t { margin-top: 10px; }

.type-badge { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
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
.medium-card { width: 480px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row.align-start { align-items: flex-start; }
.form-row label { width: 80px; font-weight: bold; }
.form-row input[type="text"] { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
.req { color: #ef4444; }

.type-btn-group { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; }
.type-btn { padding: 6px 16px; border: none; background: #ffffff; font-size: 12px; cursor: pointer; color: #475569; transition: all 0.2s; }
.type-btn.active { background: #5b7db1; color: white; font-weight: bold; }

.options-container { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.option-row { display: flex; align-items: center; gap: 8px; width: 100%; }
.option-input { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; }
.add-option-btn { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; font-weight: bold; text-align: center; margin-top: 4px; }

.input-with-counter { position: relative; flex: 1; display: flex; align-items: center; }
.counter-input { width: 100%; padding: 6px 60px 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-sizing: border-box; outline: none; }
.input-char-counter { position: absolute; right: 10px; font-size: 11px; color: #94a3b8; pointer-events: none; }

.sort-input-group { display: flex; align-items: center; flex: 1; }
.sort-num-input { width: 80px; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; text-align: center; }
.type-hint-text { font-size: 12px; color: #94a3b8; }

/* 置中刪除確認 Modal */
.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }
</style>