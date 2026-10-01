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

const skillCategory = ref('jueji')
const searchSkillQuery = ref('')
const currentGuildId = ref(null)

// 預設絕技 (14 項)
const DEFAULT_JUEJI = [
  '太極圖', '奶絕', '鈞天浩意', '蝶舞清夢', '花縈凌波',
  '九天雷引', '冰火絕滅', '昀光神劍', '大鬧天宮', '劍魂沖霄',
  '天遁白虹', '殘心三絕劍', '九靈本家絕', '騰龍躍淵'
]

// 預設群俠百家 (12 項)
const DEFAULT_QUNXIA = [
  '咚咚跳台', '冰牆', '風雪載圖。同歸', '不攻', '雲影濯香',
  '潮傾浪野', '清弦鳴絕', '不動禪心', '四大皆空', '心眼無量',
  '猿戲功', '流月無痕'
]

// 預設流派技能 (5 項)
const DEFAULT_LIUPAI = [
  '約定', '山盟', '清泉', '鐵壁', '碧海靈佑'
]

const nowTimeStr = '2026-09-30 00:00'

// 初始 State 帶入預設資料
const juejiSkillList = ref(
  DEFAULT_JUEJI.map((content, idx) => ({
    id: `def_j_${idx}`, content, createdAt: nowTimeStr, lastUsed: nowTimeStr, sortOrder: idx + 1
  }))
)

const qunxiaSkillList = ref(
  DEFAULT_QUNXIA.map((content, idx) => ({
    id: `def_q_${idx}`, content, createdAt: nowTimeStr, lastUsed: nowTimeStr, sortOrder: idx + 1
  }))
)

const liupaiSkillList = ref(
  DEFAULT_LIUPAI.map((content, idx) => ({
    id: `def_l_${idx}`, content, createdAt: nowTimeStr, lastUsed: nowTimeStr, sortOrder: idx + 1
  }))
)

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

const fetchCurrentGuild = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (profile) {
      if (profile.guild_id) return profile.guild_id
      if (profile.guild_ids && profile.guild_ids.length > 0) return profile.guild_ids[0]
    }

    const { data: guilds } = await supabase.from('guilds').select('id').limit(1)
    if (guilds && guilds.length > 0) return guilds[0].id
  } catch (e) {
    console.warn('獲取幫會資訊失敗:', e)
  }
  return null
}

const loadSkillsFromDB = async () => {
  const gId = await fetchCurrentGuild()
  currentGuildId.value = gId

  // 同時查詢當前幫會專屬技能與跨幫會通用技能 (guild_id IS NULL)
  let query = supabase.from('preparation_skills').select('*')
  if (gId) {
    query = query.or(`guild_id.eq.${gId},guild_id.is.null`)
  } else {
    query = query.is('guild_id', null)
  }

  const { data, error } = await query.order('sort_order', { ascending: true })

  if (error) {
    console.error('查詢 preparation_skills 失敗:', error)
    return
  }

  // 若 DB 完全無記錄，為幫會寫入預設技能
  if (gId) {
    const dbJueji = (data || []).filter(s => s.category === 'jueji')
    const dbQunxia = (data || []).filter(s => s.category === 'qunxia')
    const dbLiupai = (data || []).filter(s => s.category === 'liupai')

    if (dbJueji.length === 0) {
      const initJ = DEFAULT_JUEJI.map((content, idx) => ({
        guild_id: gId, category: 'jueji', content, is_enabled: true, sort_order: idx + 1
      }))
      await supabase.from('preparation_skills').insert(initJ)
    }
    if (dbQunxia.length === 0) {
      const initQ = DEFAULT_QUNXIA.map((content, idx) => ({
        guild_id: gId, category: 'qunxia', content, is_enabled: true, sort_order: idx + 1
      }))
      await supabase.from('preparation_skills').insert(initQ)
    }
    if (dbLiupai.length === 0) {
      const initL = DEFAULT_LIUPAI.map((content, idx) => ({
        guild_id: gId, category: 'liupai', content, is_enabled: true, sort_order: idx + 1
      }))
      await supabase.from('preparation_skills').insert(initL)
    }
  }

  // 重新拉取最新資料
  let fetchQuery = supabase.from('preparation_skills').select('*')
  if (gId) {
    fetchQuery = fetchQuery.or(`guild_id.eq.${gId},guild_id.is.null`)
  } else {
    fetchQuery = fetchQuery.is('guild_id', null)
  }

  const { data: latestData } = await fetchQuery.order('sort_order', { ascending: true })

  if (latestData && latestData.length > 0) {
    const formatTime = (isoStr) => isoStr ? isoStr.replace('T', ' ').slice(0, 16) : nowTimeStr

    // 按內容 (content) 去重，確保跨幫會重複技能不重複顯示
    const uniqueMap = new Map()
    latestData.forEach(s => {
      const key = `${s.category}_${s.content}`
      if (!uniqueMap.has(key)) {
        uniqueMap.set(key, {
          id: s.id,
          content: s.content,
          category: s.category,
          createdAt: formatTime(s.created_at),
          lastUsed: formatTime(s.updated_at || s.created_at),
          sortOrder: s.sort_order
        })
      }
    })

    const allSkills = Array.from(uniqueMap.values())
    juejiSkillList.value = allSkills.filter(s => s.category === 'jueji')
    qunxiaSkillList.value = allSkills.filter(s => s.category === 'qunxia')
    liupaiSkillList.value = allSkills.filter(s => s.category === 'liupai')
  }
}

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

// 拖拽排序與更新
const skillDragIndex = ref(null)
const onSkillDragStart = (index) => { skillDragIndex.value = index }
const onSkillDrop = async (targetIndex) => {
  if (skillDragIndex.value === null || skillDragIndex.value === targetIndex) return
  const list = currentSkillList.value
  const movedItem = list.splice(skillDragIndex.value, 1)[0]
  list.splice(targetIndex, 0, movedItem)
  skillDragIndex.value = null

  if (currentGuildId.value) {
    for (let i = 0; i < list.length; i++) {
      const item = list[i]
      if (item.id && !String(item.id).startsWith('def_')) {
        await supabase.from('preparation_skills').update({ sort_order: i + 1 }).eq('id', item.id)
      }
    }
  }
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

// 確定保存（寫入本地 State 與 Supabase 全局通用技能）
const saveSkill = async () => {
  const content = skillForm.value.content.trim()
  if (!content) return alert('請輸入技能內容！')

  const category = skillCategory.value
  const targetList = category === 'jueji' ? juejiSkillList : (category === 'qunxia' ? qunxiaSkillList : liupaiSkillList)

  if (editingSkillId.value) {
    // 編輯模式
    const idx = targetList.value.findIndex(s => s.id === editingSkillId.value)
    if (idx > -1) {
      targetList.value[idx].content = content
      targetList.value[idx].lastUsed = nowTimeStr
    }

    if (!String(editingSkillId.value).startsWith('def_')) {
      const { error } = await supabase
        .from('preparation_skills')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', editingSkillId.value)

      if (error) {
        alert('更新失敗！請確認 Supabase 中是否已關閉 RLS：' + error.message)
        return
      }
    }
  } else {
    // 新增模式：設定 guild_id 為 null（作為跨幫會全局通用技能，所有幫會皆可讀取）
    const newObj = {
      id: Date.now(),
      content,
      createdAt: nowTimeStr,
      lastUsed: nowTimeStr,
      sortOrder: targetList.value.length + 1
    }

    const { data, error } = await supabase
      .from('preparation_skills')
      .insert([{
        guild_id: null, // 全局通用技能
        category,
        content,
        is_enabled: true,
        sort_order: targetList.value.length + 1
      }])
      .select()
      .single()

    if (error) {
      alert('新增失敗！請確認 Supabase 中已建立 preparation_skills 資料表並解除 RLS：\n' + error.message)
      return
    }

    if (data) newObj.id = data.id
    targetList.value.unshift(newObj)
  }

  showSkillModal.value = false
  await loadSkillsFromDB()
}

const deleteSkill = (id) => {
  const list = currentSkillList.value
  const target = list.find(s => s.id === id)
  const targetName = target ? target.content : ''

  triggerConfirmModal(
    '刪除技能',
    `確定要刪除${skillCategoryLabel.value}「${targetName}」嗎？刪除後無法恢復。`,
    async () => {
      if (id && !String(id).startsWith('def_')) {
        const { error } = await supabase.from('preparation_skills').delete().eq('id', id)
        if (error) {
          alert('刪除失敗：' + error.message)
          return
        }
      }
      if (skillCategory.value === 'jueji') juejiSkillList.value = juejiSkillList.value.filter(s => s.id !== id)
      else if (skillCategory.value === 'qunxia') qunxiaSkillList.value = qunxiaSkillList.value.filter(s => s.id !== id)
      else liupaiSkillList.value = liupaiSkillList.value.filter(s => s.id !== id)
    }
  )
}

onMounted(loadSkillsFromDB)
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
.btn-primary.btn-red { background: #ef4444; }
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