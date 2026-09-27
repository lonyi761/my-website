<template>
  <div :class="['prep-layout', isDarkMode ? 'dark-theme' : 'light-theme']">
    <!-- 頂部導航列 -->
    <header class="navbar">
      <div class="nav-left">
        <span class="brand-logo">行優測試</span>
      </div>

      <nav class="nav-center">
        <router-link to="/home">首頁</router-link>
        <router-link to="/members">成員</router-link>
        <a href="#">聯賽</a>
        <router-link to="/preparation" class="active">戰備</router-link>
      </nav>
      
      <div class="nav-right">
        <button class="icon-btn" @click="isDarkMode = !isDarkMode" title="切換深淺色">
          <i :class="['mdi', isDarkMode ? 'mdi-weather-night' : 'mdi-white-balance-sunny']"></i>
        </button>
        
        <div class="user-dropdown" @click.stop="showMenu = !showMenu">
          <span>{{ username }}</span>
          <i class="mdi mdi-chevron-down"></i>
          <div v-if="showMenu" class="dropdown-menu">
            <router-link to="/profile">個人中心</router-link>
            <a href="#" @click="handleLogout">登出</a>
          </div>
        </div>
      </div>
    </header>

    <!-- 主要內容區 -->
    <div class="prep-main">
      <!-- 左側選單 (已刪除 廣場招募 與 積分) -->
      <aside class="prep-sidebar">
        <ul class="sidebar-menu">
          <li :class="{ active: currentTab === 'roles' }" @click="currentTab = 'roles'">職能管理</li>
          <li :class="{ active: currentTab === 'skill' }" @click="currentTab = 'skill'">技能管理</li>
          <li :class="{ active: currentTab === 'template' }" @click="currentTab = 'template'">排表模板</li>
          <li :class="{ active: currentTab === 'faq' }" @click="currentTab = 'faq'">報名問題</li>
        </ul>
      </aside>

      <!-- 右側內容區 -->
      <main class="content-area">
        
        <!-- Tab 1: 職能管理 -->
        <div v-if="currentTab === 'roles'">
          <div class="prep-header">
            <h2>職能管理</h2>
            <p class="sub-notice">
              個人職能、團隊職能、小隊職能三類維護選項表，互不干擾。個人職能用於幫會成員角色卡片「戰備偏好」及排表卡片多選。
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
        </div>

        <!-- Tab 2: 技能管理 -->
        <div v-else-if="currentTab === 'skill'">
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
        </div>

        <!-- Tab 3: 排表模板 -->
        <div v-else-if="currentTab === 'template'">
          <div class="prep-header">
            <h2>排表模板 (150人標準陣型)</h2>
            <p class="sub-notice">包含 5 個大隊、25 個小隊、共 150 個槽位，可針對每個槽位設定預設職能與流派。</p>
          </div>
          <div class="template-matrix">
            <div v-for="(team, tIdx) in templateData.teams" :key="tIdx" class="team-card">
              <h3 class="team-title">{{ team.name }} ({{ team.squads.length }} 小隊)</h3>
              <div class="squad-grid">
                <div v-for="(squad, sIdx) in team.squads" :key="sIdx" class="squad-box">
                  <div class="squad-head">
                    <span>{{ squad.name }}</span>
                    <select v-model="squad.zhineng" class="squad-input">
                      <option value="">選擇小隊職能</option>
                      <option v-for="sq in squadRoleList" :key="sq.id" :value="sq.name">{{ sq.name }}</option>
                    </select>
                  </div>
                  <div class="slot-list">
                    <div v-for="(slot, slotIdx) in squad.slots" :key="slotIdx" class="slot-item">
                      <span class="slot-num">#{{ slotIdx + 1 }}</span>
                      <select v-model="slot.zhineng_list[0]" class="slot-select">
                        <option value="">選取個人職能</option>
                        <option v-for="r in personalRoleList" :key="r.id" :value="r.name">{{ r.name }}</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Tab 4: 報名問題 (圖一對應) -->
        <div v-else-if="currentTab === 'faq'">
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
        </div>

      </main>
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

    <!-- 報名問題 Modal (圖二、圖三對應) -->
    <div v-if="showQuestionModal" class="modal-overlay" @click.self="showQuestionModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>{{ editingQuestionId ? '編輯報名問題' : '新增報名問題' }}</h3>
          <span class="close-btn" @click="showQuestionModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <!-- 題幹 (200字限制) -->
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

          <!-- 題型按鈕組 -->
          <div class="form-row margin-t">
            <label><span class="req">*</span>題型：</label>
            <div class="type-btn-group">
              <button 
                :class="['type-btn', { active: questionForm.type === 'radio' }]" 
                @click="questionForm.type = 'radio'"
              >
                單選
              </button>
              <button 
                :class="['type-btn', { active: questionForm.type === 'checkbox' }]" 
                @click="questionForm.type = 'checkbox'"
              >
                多選
              </button>
              <button 
                :class="['type-btn', { active: questionForm.type === 'text' }]" 
                @click="questionForm.type = 'text'"
              >
                文本
              </button>
            </div>
          </div>

          <!-- 選項 (單選 / 多選時顯示 - 圖二) -->
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

          <!-- 占位提示 (文本時顯示 - 圖三) -->
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

          <!-- 必填開關 -->
          <div class="form-row margin-t">
            <label>必填：</label>
            <label class="switch">
              <input type="checkbox" v-model="questionForm.is_required" />
              <span class="slider"></span>
            </label>
          </div>

          <!-- 排序數字 -->
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

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const isDarkMode = ref(false)
const showMenu = ref(false)
const username = ref('VIP')

const currentTab = ref('roles')
const roleCategory = ref('personal')
const skillCategory = ref('jueji') // jueji, qunxia, liupai

// 1. 個人職能數據
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

// 2. 小隊職能數據
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

// 職能拖曳排序
const dragIndex = ref(null)
const onDragStart = (index) => { dragIndex.value = index }
const onDrop = (targetIndex) => {
  if (dragIndex.value === null || dragIndex.value === targetIndex) return
  const list = currentRoleList.value
  const movedItem = list.splice(dragIndex.value, 1)[0]
  list.splice(targetIndex, 0, movedItem)
  dragIndex.value = null
}

// 技能數據 (絕技、群俠百家、流派技能)
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

const searchSkillQuery = ref('')

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

// 技能拖曳排序
const skillDragIndex = ref(null)
const onSkillDragStart = (index) => { skillDragIndex.value = index }
const onSkillDrop = (targetIndex) => {
  if (skillDragIndex.value === null || skillDragIndex.value === targetIndex) return
  const list = currentSkillList.value
  const movedItem = list.splice(skillDragIndex.value, 1)[0]
  list.splice(targetIndex, 0, movedItem)
  skillDragIndex.value = null
}

// 技能 Modal 控制
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

// 報名問題數據與邏輯
const questionList = ref([
  { id: 1, title: '本場聯賽開車', type: 'radio', options: ['能', '不能'], placeholder: '', is_required: true, sort_order: 1 },
  { id: 2, title: '本場聯賽保車', type: 'radio', options: ['能', '不能'], placeholder: '', is_required: true, sort_order: 2 }
])

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
    // 新增置頂
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
  if (confirm('確定要刪除該問題嗎？')) questionList.value = questionList.value.filter(q => q.id !== id)
}

// 排表數據生成
const DEFAULT_TEAM_NAMES = ['一隊', '二隊', '三隊', '四隊', '五隊']

function createDefaultSlot() {
  return {
    liupai_list: [],
    liupai_xingtai_map: {},
    zhineng_list: [''],
    desc: '',
    jueji_pz: '',
    qunxia_pz: '',
    zhuangbei_pz: ''
  }
}

function createDefaultSquad(squadIdx) {
  return {
    hidden: false,
    name: `${squadIdx + 1}小隊`,
    zhineng: '',
    desc: '',
    slots: Array.from({ length: 6 }, () => createDefaultSlot())
  }
}

function createDefaultTeam(teamIdx) {
  return {
    hidden: false,
    name: DEFAULT_TEAM_NAMES[teamIdx] || `${teamIdx + 1}隊`,
    desc: '',
    squads: Array.from({ length: 5 }, (_, i) => createDefaultSquad(i))
  }
}

function createDefaultTemplate() {
  return {
    teams: Array.from({ length: 5 }, (_, i) => createDefaultTeam(i))
  }
}

const templateData = ref(createDefaultTemplate())

// Modal 控制邏輯
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
    targetList.push({ 
      id: Date.now(), 
      name: roleForm.value.name.trim(),
      desc: roleForm.value.desc.trim(),
      tagSwitch: false
    })
  }
  showRoleModal.value = false
}

const deleteRole = (id) => {
  if (confirm('確定要刪除該職能嗎？')) {
    if (roleCategory.value === 'personal') {
      personalRoleList.value = personalRoleList.value.filter(r => r.id !== id)
    } else {
      squadRoleList.value = squadRoleList.value.filter(r => r.id !== id)
    }
  }
}

onMounted(() => {
  const user = JSON.parse(localStorage.getItem('user'))
  if (user) username.value = user.username
  else router.push('/login')
})

const handleLogout = () => {
  localStorage.removeItem('user')
  router.push('/login')
}
</script>

<style scoped>
.prep-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
.light-theme { background-color: #f4f6f9; color: #2c3e50; }
.light-theme .navbar { background: #ffffff; border-bottom: 1px solid #e2e8f0; }
.dark-theme { background-color: #121824; color: #e2e8f0; }
.dark-theme .navbar { background: #1e2638; border-bottom: 1px solid #2d3748; }

.navbar { height: 55px; padding: 0 30px; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.brand-logo { font-size: 16px; font-weight: bold; }
.nav-center a { margin: 0 15px; text-decoration: none; color: inherit; opacity: 0.7; font-size: 14px; }
.nav-center a.active { opacity: 1; font-weight: 600; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; }
.nav-right { display: flex; align-items: center; gap: 15px; }
.icon-btn { background: none; border: none; font-size: 18px; cursor: pointer; color: inherit; }
.user-dropdown { position: relative; cursor: pointer; font-size: 14px; display: flex; align-items: center; gap: 4px; }

.prep-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }
.prep-sidebar { width: 180px; background: #ffffff; border-radius: 8px; padding: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-menu { list-style: none; padding: 0; margin: 0; }
.sidebar-menu li { padding: 12px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; margin-bottom: 4px; color: #64748b; transition: all 0.2s; }
.sidebar-menu li.active, .sidebar-menu li:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.prep-header h2 { margin: 0 0 8px 0; font-size: 16px; }
.header-with-btn { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.header-with-btn h2 { margin: 0; }
.sub-notice { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #3b82f6; }

.toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sub-tabs { display: flex; gap: 15px; border-bottom: 1px solid #e2e8f0; }
.sub-tab-btn { background: none; border: none; padding: 8px 4px; font-size: 13px; cursor: pointer; color: #64748b; position: relative; }
.sub-tab-btn.active { color: #2563eb; font-weight: bold; }
.sub-tab-btn.active::after { content: ''; position: absolute; bottom: -1px; left: 0; width: 100%; height: 2px; background: #2563eb; }

/* 搜尋條樣式 */
.filter-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 15px; }
.search-input-wrapper { position: relative; width: 220px; display: flex; align-items: center; }
.search-icon { position: absolute; left: 8px; color: #94a3b8; font-size: 16px; }
.filter-search-input { width: 100%; padding: 6px 12px 6px 28px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; }
.count-text { font-size: 12px; color: #64748b; }
.text-gray { color: #64748b; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }

.type-badge { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

.data-table tr[draggable="true"] { cursor: grab; }
.data-table tr.dragging-row { opacity: 0.4; background: #f1f5f9; }
.drag-handle-cell { display: flex; align-items: center; justify-content: center; color: #64748b; user-select: none; }
.drag-icon { font-size: 16px; color: #94a3b8; }

/* 150人排表矩陣樣式 */
.template-matrix { display: flex; flex-direction: column; gap: 20px; }
.team-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
.team-title { margin: 0 0 12px 0; font-size: 15px; color: #1e293b; }
.squad-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.squad-box { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
.squad-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: bold; font-size: 12px; }
.squad-input { width: 100px; padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; }
.slot-list { display: flex; flex-direction: column; gap: 4px; }
.slot-item { display: flex; align-items: center; justify-content: space-between; font-size: 11px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
.slot-select { font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; }

/* Switch */
.switch { position: relative; display: inline-block; width: 34px; height: 18px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 18px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(16px); }

/* Modal 彈窗細節 (對應圖二、圖三) */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.small-card { width: 380px; }
.medium-card { width: 480px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row.align-start { align-items: flex-start; }
.form-row label { width: 80px; font-weight: bold; }
.form-row input[type="text"], .form-row select { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 13px; }
.req { color: #ef4444; }

.type-value-group { display: flex; align-items: center; gap: 8px; flex: 1; }
.type-badge-btn { border: 1px solid #cbd5e1; background: #ffffff; padding: 2px 12px; border-radius: 6px; font-size: 12px; color: #334155; }
.type-hint-text { font-size: 12px; color: #94a3b8; }

.textarea-wrapper { position: relative; flex: 1; display: flex; flex-direction: column; }
.skill-textarea { width: 100%; height: 80px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; resize: none; box-sizing: border-box; outline: none; }
.char-counter { position: absolute; right: 10px; bottom: 8px; font-size: 11px; color: #94a3b8; pointer-events: none; }

/* 題型與選項 (圖二/圖三) */
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

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.margin-b { margin-bottom: 15px; }
.margin-t { margin-top: 10px; }
.empty-tab-box { text-align: center; padding: 50px; color: #94a3b8; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }
</style>