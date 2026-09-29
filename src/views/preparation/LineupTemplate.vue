<template>
  <div class="lineup-template">
    
    <!-- 1. 模板清單視圖 -->
    <div v-if="currentView === 'list'">
      <div class="prep-header">
        <div class="header-with-btn">
          <h2>排表模板管理</h2>
          <button class="btn-primary" @click="openTemplateModal()">+ 新建模板</button>
        </div>
        <p class="sub-notice"></p>
      </div>

      <div class="filter-bar margin-b">
        <div class="search-input-wrapper">
          <i class="mdi mdi-magnify search-icon"></i>
          <input type="text" v-model="searchQuery" placeholder="搜尋模板名稱" class="filter-search-input" />
        </div>
        <span class="count-text">共 {{ filteredTemplates.length }} 條</span>
      </div>

      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th width="60">#</th>
              <th>模板名稱</th>
              <th>說明</th>
              <th width="180">更新時間</th>
              <th width="180">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(tpl, idx) in filteredTemplates" :key="tpl.id">
              <td>{{ idx + 1 }}</td>
              <td class="font-bold text-blue clickable-title" @click="enterEditor(tpl)">{{ tpl.name }}</td>
              <td class="text-gray">{{ tpl.desc || '—' }}</td>
              <td class="text-gray">{{ tpl.updatedAt }}</td>
              <td>
                <button class="btn-link" @click="enterEditor(tpl)">編輯排表</button>
                <button class="btn-link margin-l" @click="openTemplateModal(tpl)">修改</button>
                <button class="btn-link text-red margin-l" @click="confirmDeleteTemplate(tpl)">刪除</button>
              </td>
            </tr>
            <tr v-if="filteredTemplates.length === 0">
              <td colspan="5" class="empty-cell">暫無模板數據，可點右上角「新建模板」添加</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 2. 排表矩陣編輯視圖 -->
    <div v-else-if="currentView === 'editor'" class="editor-container">
      <div class="editor-header-bar">
        <div class="back-title-group">
          <button class="btn-back" @click="currentView = 'list'">&lt; 返回列表</button>
          <span class="editing-tpl-name">{{ activeTemplate.name }}</span>
        </div>

        <div class="editor-top-actions">
          <!-- 顯示詳情開關 -->
          <div class="switch-control">
            <span class="switch-label-text">顯示詳情</span>
            <label class="switch">
              <input type="checkbox" v-model="showDetails" />
              <span class="slider"></span>
            </label>
          </div>

          <button class="btn-primary margin-l" @click="addTeam">+ 添加團隊</button>
        </div>
      </div>

      <!-- 團隊列表 -->
      <div class="teams-container">
        <div v-for="(team, tIdx) in activeTemplate.teams" :key="team.id" class="team-block">
          
          <!-- 團隊標頭 -->
          <div class="team-header-row">
            <button class="team-badge-btn" @click="openTeamModal(team, tIdx)">
              {{ team.name }} <i class="mdi mdi-pencil-outline icon-sm"></i>
            </button>
            <button class="add-squad-btn" @click="addSquadToTeam(team)">+ 添加小隊</button>
          </div>

          <!-- 小隊網格 -->
          <div class="squads-grid">
            <div v-for="(squad, sIdx) in team.squads" :key="squad.id" class="squad-card">
              
              <!-- 小隊標頭 -->
              <div class="squad-card-head" @click="openSquadModal(team, squad, sIdx)">
                <span class="squad-name-label">{{ squad.name }}<template v-if="squad.zhineng">-{{ squad.zhineng }}</template></span>
                <i class="mdi mdi-cog-outline squad-cog-icon"></i>
              </div>

              <!-- 6個席位列表 -->
              <div class="slots-container">
                <div 
                  v-for="(slot, slotIdx) in squad.slots" 
                  :key="slot.id" 
                  :class="['slot-card', { 'detail-mode': showDetails }]"
                  :style="getSlotCardStyle(slot)"
                  @click="openSlotModal(team, squad, slot, slotIdx)"
                >
                  <!-- 精簡檢視 -->
                  <template v-if="!showDetails">
                    <div class="slot-compact-body">
                      <div class="slot-school-icons" v-if="slot.liupai_list && slot.liupai_list.length > 0">
                        <img 
                          v-for="sName in slot.liupai_list" 
                          :key="sName"
                          :src="getSchoolImgByName(sName)" 
                          class="slot-icon-badge" 
                          :alt="sName"
                        />
                      </div>
                      <span class="slot-role-text">{{ getSlotRoleText(slot) }}</span>
                    </div>
                  </template>

                  <!-- 詳情檢視 -->
                  <template v-else>
                    <div class="slot-detail-body">
                      <div class="detail-head">
                        <img 
                          v-if="slot.liupai_list && slot.liupai_list.length > 0" 
                          :src="getSchoolImgByName(slot.liupai_list[0])" 
                          class="slot-icon-badge" 
                        />
                        <span class="detail-role-title">{{ getSlotRoleText(slot) }}</span>
                      </div>
                      <div class="detail-line">絕技：{{ slot.jueji_pz || '—' }}</div>
                      <div class="detail-line">群俠：{{ slot.qunxia_pz || '—' }}</div>
                      <div class="detail-line">裝備：{{ slot.zhuangbei_pz || '—' }}</div>
                      <div class="detail-line">描述：{{ slot.desc || '—' }}</div>
                    </div>
                  </template>

                  <span class="slot-remove-x" @click.stop="clearSlot(slot)">&times;</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>

    <!-- 3. 新建 / 修改模板 Modal -->
    <div v-if="showTemplateModal" class="modal-overlay" @click.self="showTemplateModal = false">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>{{ editingTemplateId ? '修改排表模板' : '新建排表模板' }}</h3>
          <span class="close-btn" @click="showTemplateModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row align-start">
            <label><span class="req">*</span>名稱：</label>
            <div class="input-with-counter">
              <input 
                type="text" 
                v-model="templateForm.name" 
                maxlength="64" 
                placeholder="請輸入模板名稱" 
                class="counter-input"
              />
              <span class="input-char-counter">{{ templateForm.name.length }} / 64</span>
            </div>
          </div>

          <div class="form-row align-start margin-t">
            <label>說明：</label>
            <div class="textarea-wrapper">
              <textarea 
                v-model="templateForm.desc" 
                maxlength="500" 
                placeholder="選填，簡要說明模板用途" 
                class="skill-textarea"
              ></textarea>
              <span class="char-counter">{{ templateForm.desc.length }} / 500</span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showTemplateModal = false">取消</button>
          <button class="btn-primary" @click="saveTemplate">保存</button>
        </div>
      </div>
    </div>

    <!-- 4. 團隊設定 Modal -->
    <div v-if="showTeamModal" class="modal-overlay" @click.self="showTeamModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>團隊設定</h3>
          <span class="close-btn" @click="showTeamModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label><span class="req">*</span>團隊名稱：</label>
            <input type="text" v-model="teamForm.name" maxlength="30" placeholder="如：進攻一團" class="flex-1" />
          </div>
          <div class="form-row align-start margin-t">
            <label>團隊描述：</label>
            <div class="textarea-wrapper">
              <textarea v-model="teamForm.desc" maxlength="30" placeholder="選填，最多 30 字" class="skill-textarea h-60"></textarea>
              <span class="char-counter">{{ teamForm.desc.length }} / 30</span>
            </div>
          </div>
          <div class="danger-zone margin-t">
            <button class="btn-link text-red font-bold" @click="confirmDeleteTeam">刪除團隊</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showTeamModal = false">取消</button>
          <button class="btn-primary" @click="saveTeamModal">保存</button>
        </div>
      </div>
    </div>

    <!-- 5. 小隊設定 Modal -->
    <div v-if="showSquadModal" class="modal-overlay" @click.self="showSquadModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>小隊設定</h3>
          <span class="close-btn" @click="showSquadModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label><span class="req">*</span>小隊名：</label>
            <div class="input-with-counter">
              <input type="text" v-model="squadForm.name" maxlength="8" class="counter-input" />
              <span class="input-char-counter">{{ squadForm.name.length }} / 8</span>
            </div>
          </div>
          <div class="form-row">
            <label>所屬團隊：</label>
            <span class="text-gray-val">{{ activeTeamForSquad?.name || '—' }}</span>
          </div>
          <div class="form-row">
            <label>小隊職能：</label>
            <select v-model="squadForm.zhineng" class="flex-1">
              <option value="">選擇小隊職能</option>
              <option v-for="sq in squadRoleOptions" :key="sq" :value="sq">{{ sq }}</option>
            </select>
          </div>
          <div class="form-row align-start margin-t">
            <label>小隊描述：</label>
            <div class="textarea-wrapper">
              <textarea v-model="squadForm.desc" maxlength="15" placeholder="選填，最多 15 字" class="skill-textarea h-60"></textarea>
              <span class="char-counter">{{ squadForm.desc.length }} / 15</span>
            </div>
          </div>
          <div class="danger-zone margin-t">
            <button class="btn-link text-red font-bold" @click="confirmDeleteSquad">刪除小隊</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showSquadModal = false">取消</button>
          <button class="btn-primary" @click="saveSquadModal">保存</button>
        </div>
      </div>
    </div>

    <!-- 6. 席位配置 Modal -->
    <div v-if="showSlotModal" class="modal-overlay" @click.self="closeSlotModal">
      <div class="modal-card slot-modal-card" @click="closeAllSkillDropdowns">
        <div class="modal-header">
          <h3>席位配置</h3>
          <span class="close-btn" @click="closeSlotModal">&times;</span>
        </div>

        <div class="modal-body">
          <div class="slot-location-tag">
            {{ activeTeamForSlot?.name }} - {{ activeSquadForSlot?.name }} - 第 {{ activeSlotIndex + 1 }} 席
          </div>

          <!-- 推薦流派 -->
          <div class="form-block">
            <div class="block-title"><span class="req">*</span>推薦流派</div>
            <div class="school-pills-group">
              <button 
                v-for="s in availableSchools" 
                :key="s.name"
                :class="['school-btn-card', { active: slotForm.liupai_list.includes(s.name) }]"
                :style="{ '--badge-color': s.color, '--badge-bg': s.bg }"
                @click="toggleSlotSchool(s.name)"
              >
                <img :src="getSchoolImg(s.file)" class="btn-img-icon" />
                <span>{{ s.name }}</span>
              </button>
            </div>
          </div>

          <!-- 推薦職能 -->
          <div class="form-block margin-t">
            <div class="block-title">推薦職能</div>
            <div class="role-tag-grid">
              <button 
                v-for="rName in personalRoleOptions" 
                :key="rName"
                :class="['role-tag-btn', { active: slotForm.zhineng_list.includes(rName) }]"
                @click="toggleSlotRole(rName)"
              >
                {{ rName }}
              </button>
            </div>
          </div>

          <!-- 推薦技能 -->
          <div class="form-block margin-t">
            <div class="block-title">推薦技能</div>
            <div class="sub-hint">與聯賽排表中的配裝資訊一致，可從歷史記錄選擇或手動輸入，每項最長 20 字。</div>

            <!-- 絕技 -->
            <div class="skill-input-row margin-t">
              <label>絕技：</label>
              <div class="custom-dropdown-container">
                <input 
                  type="text" 
                  v-model="slotForm.jueji_pz" 
                  placeholder="輸入或選擇絕技" 
                  maxlength="20"
                  class="skill-input-field"
                  @click.stop
                />
                <button 
                  type="button" 
                  class="dropdown-toggle-btn" 
                  @click.stop="toggleSkillDropdown('jueji')"
                  title="點擊展開選單"
                >
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'jueji' }]"></i>
                </button>

                <div v-if="activeSkillDropdown === 'jueji'" class="skill-dropdown-panel" @click.stop>
                  <div 
                    v-for="j in juejiOptions" 
                    :key="j" 
                    class="dropdown-item"
                    @click="selectJueji(j)"
                  >
                    {{ j }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 群俠百家 -->
            <div class="skill-input-row margin-t">
              <label>群俠百家：</label>
              <div class="custom-dropdown-container">
                <input 
                  type="text" 
                  v-model="slotForm.qunxia_pz" 
                  placeholder="輸入或選擇群俠百家 (可複選)" 
                  maxlength="20"
                  class="skill-input-field"
                  @click.stop
                />
                <button 
                  type="button" 
                  class="dropdown-toggle-btn" 
                  @click.stop="toggleSkillDropdown('qunxia')"
                  title="點擊展開選單"
                >
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'qunxia' }]"></i>
                </button>

                <div v-if="activeSkillDropdown === 'qunxia'" class="skill-dropdown-panel" @click.stop>
                  <div 
                    v-for="q in qunxiaOptions" 
                    :key="q" 
                    :class="['dropdown-item', { selected: isQunxiaSelected(q) }]"
                    @click="toggleQunxia(q)"
                  >
                    <span>{{ q }}</span>
                    <i v-if="isQunxiaSelected(q)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>

            <!-- 流派技能 -->
            <div class="skill-input-row margin-t">
              <label>流派技能：</label>
              <div class="custom-dropdown-container">
                <input 
                  type="text" 
                  v-model="slotForm.zhuangbei_pz" 
                  placeholder="輸入或選擇流派技能 (可複選)" 
                  maxlength="20"
                  class="skill-input-field"
                  @click.stop
                />
                <button 
                  type="button" 
                  class="dropdown-toggle-btn" 
                  @click.stop="toggleSkillDropdown('liupai')"
                  title="點擊展開選單"
                >
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'liupai' }]"></i>
                </button>

                <div v-if="activeSkillDropdown === 'liupai'" class="skill-dropdown-panel" @click.stop>
                  <div 
                    v-for="l in liupaiSkillOptions" 
                    :key="l" 
                    :class="['dropdown-item', { selected: isLiupaiSelected(l) }]"
                    @click="toggleLiupaiSkill(l)"
                  >
                    <span>{{ l }}</span>
                    <i v-if="isLiupaiSelected(l)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <!-- 描述 -->
          <div class="form-block margin-t">
            <div class="block-title">描述</div>
            <div class="textarea-wrapper margin-t">
              <textarea 
                v-model="slotForm.desc" 
                maxlength="200" 
                placeholder="選填，例如這部分的戰術職能" 
                class="skill-textarea h-80"
              ></textarea>
              <span class="char-counter">{{ slotForm.desc.length }} / 200</span>
            </div>
          </div>

        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="closeSlotModal">取消</button>
          <button class="btn-primary" @click="saveSlotModal">確定</button>
        </div>
      </div>
    </div>

    <!-- 7. 美化置中刪除確認 Modal -->
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
import { ref, computed, onMounted, onUnmounted } from 'vue'

const currentView = ref('list')
const searchQuery = ref('')
const showDetails = ref(false)

const availableSchools = [
  { name: '鐵衣', file: 'ty', color: '#d97706', bg: '#fef3c7' },
  { name: '血河', file: 'xh', color: '#e11d48', bg: '#ffe4e6' },
  { name: '九靈', file: 'jl', color: '#8b5cf6', bg: '#f3e8ff' },
  { name: '神相', file: 'sx', color: '#6366f1', bg: '#e0e7ff' },
  { name: '碎夢', file: 'sm', color: '#06b6d4', bg: '#cffaff' },
  { name: '素問', file: 'sw', color: '#f43f5e', bg: '#ffe4e6' },
  { name: '龍吟', file: 'ly', color: '#10b981', bg: '#d1fae5' },
  { name: '玄機', file: 'xj', color: '#84cc16', bg: '#ecfccb' },
  { name: '潮光', file: 'cg', color: '#38bdf8', bg: '#f0f9ff' },
  { name: '滄瀾', file: 'cl', color: '#0284c7', bg: '#e0e7ff' },
  { name: '鴻音', file: 'hy', color: '#ec4899', bg: '#fce7f3' }
]

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  const found = availableSchools.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

const personalRoleOptions = [
  '保鑣', '埋頭猛拆', '塔仇御鐵', '潮砲', '奶絕奶',
  '增益奶', '輔潮', '燒屍體', '騰龍合軸', '拆塔指揮',
  '保鑣指揮', '防守指揮', '點殺'
]

const squadRoleOptions = [
  '保鑣隊', '拆塔隊', '塔前隊', '塔後隊', '防守隊'
]

const juejiOptions = ['狂發一怒', '太極圖']
const qunxiaOptions = ['咚咚跳台', '雲影濁香']
const liupaiSkillOptions = ['約定', '清泉']

const schoolColorMap = {
  '鐵衣': '#fef3c7',
  '血河': '#ffe4e6',
  '九靈': '#f3e8ff',
  '神相': '#e0e7ff',
  '碎夢': '#cffaff',
  '素問': '#ffe4e6',
  '龍吟': '#d1fae5',
  '玄機': '#ecfccb',
  '潮光': '#f0f9ff',
  '滄瀾': '#e0e7ff',
  '鴻音': '#fce7f3'
}

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

// 預設範本列表
const templateList = ref([
  { 
    id: 1, 
    name: '甲組通用排表', 
    desc: '', 
    updatedAt: '2026-09-28 02:52',
    teams: createSampleTeams()
  },
  { 
    id: 2, 
    name: '乙組攻防陣型', 
    desc: '', 
    updatedAt: '2026-09-28 01:15',
    teams: createSampleTeams()
  }
])

const filteredTemplates = computed(() => {
  if (!searchQuery.value.trim()) return templateList.value
  return templateList.value.filter(t => t.name.toLowerCase().includes(searchQuery.value.toLowerCase().trim()))
})

function createEmptySlot() {
  return {
    id: Math.random(),
    liupai_list: [],
    zhineng_list: [],
    desc: '',
    jueji_pz: '',
    qunxia_pz: '',
    zhuangbei_pz: ''
  }
}

function createEmptySquad(squadIdx, squadName = '') {
  return {
    id: Math.random(),
    name: squadName || `${squadIdx + 1}隊`,
    zhineng: '',
    desc: '',
    slots: Array.from({ length: 6 }, () => createEmptySlot())
  }
}

function createEmptyTeam(teamName = '新團隊') {
  return {
    id: Math.random(),
    name: teamName,
    desc: '',
    squads: Array.from({ length: 5 }, (_, i) => createEmptySquad(i))
  }
}

function createSampleTeams() {
  return [
    createEmptyTeam('進攻一團'),
    createEmptyTeam('進攻二團'),
    createEmptyTeam('防守一團')
  ]
}

const activeTemplate = ref(null)

const enterEditor = (tpl) => {
  activeTemplate.value = tpl
  currentView.value = 'editor'
}

// 模板 Modal
const showTemplateModal = ref(false)
const editingTemplateId = ref(null)
const templateForm = ref({ name: '', desc: '' })

const openTemplateModal = (tpl = null) => {
  if (tpl) {
    editingTemplateId.value = tpl.id
    templateForm.value = { name: tpl.name, desc: tpl.desc || '' }
  } else {
    editingTemplateId.value = null
    templateForm.value = { name: '', desc: '' }
  }
  showTemplateModal.value = true
}

const saveTemplate = () => {
  const name = templateForm.value.name.trim()
  if (!name) return alert('請輸入模板名稱！')

  const nowStr = '2026-09-28 03:00'
  if (editingTemplateId.value) {
    const idx = templateList.value.findIndex(t => t.id === editingTemplateId.value)
    if (idx > -1) {
      templateList.value[idx].name = name
      templateList.value[idx].desc = templateForm.value.desc.trim()
      templateList.value[idx].updatedAt = nowStr
    }
  } else {
    templateList.value.unshift({
      id: Date.now(),
      name,
      desc: templateForm.value.desc.trim(),
      updatedAt: nowStr,
      teams: createSampleTeams()
    })
  }
  showTemplateModal.value = false
}

const confirmDeleteTemplate = (tpl) => {
  triggerConfirmModal(
    '刪除模板',
    `確定要刪除模板「${tpl.name}」嗎？`,
    () => {
      templateList.value = templateList.value.filter(t => t.id !== tpl.id)
    }
  )
}

// 團隊/小隊新增
const addTeam = () => {
  const num = activeTemplate.value.teams.length + 1
  activeTemplate.value.teams.push(createEmptyTeam(`團隊 ${num}`))
}

const addSquadToTeam = (team) => {
  const squadNum = team.squads.length + 1
  team.squads.push(createEmptySquad(squadNum - 1))
}

// 團隊 Modal
const showTeamModal = ref(false)
const activeTeamIndex = ref(null)
const teamForm = ref({ name: '', desc: '' })

const openTeamModal = (team, idx) => {
  activeTeamIndex.value = idx
  teamForm.value = { name: team.name, desc: team.desc || '' }
  showTeamModal.value = true
}

const saveTeamModal = () => {
  if (!teamForm.value.name.trim()) return alert('請輸入團隊名稱！')
  const team = activeTemplate.value.teams[activeTeamIndex.value]
  if (team) {
    team.name = teamForm.value.name.trim()
    team.desc = teamForm.value.desc.trim()
  }
  showTeamModal.value = false
}

const confirmDeleteTeam = () => {
  const team = activeTemplate.value.teams[activeTeamIndex.value]
  triggerConfirmModal(
    '刪除團隊',
    `確定刪除「${team.name}」？刪除後可點擊「添加團隊」重新創建。`,
    () => {
      activeTemplate.value.teams.splice(activeTeamIndex.value, 1)
      showTeamModal.value = false
    }
  )
}

// 小隊 Modal
const showSquadModal = ref(false)
const activeTeamForSquad = ref(null)
const activeSquadIndex = ref(null)
const squadForm = ref({ name: '', zhineng: '', desc: '' })

const openSquadModal = (team, squad, sIdx) => {
  activeTeamForSquad.value = team
  activeSquadIndex.value = sIdx
  squadForm.value = {
    name: squad.name,
    zhineng: squad.zhineng || '',
    desc: squad.desc || ''
  }
  showSquadModal.value = true
}

const saveSquadModal = () => {
  if (!squadForm.value.name.trim()) return alert('請輸入小隊名！')
  const squad = activeTeamForSquad.value.squads[activeSquadIndex.value]
  if (squad) {
    squad.name = squadForm.value.name.trim()
    squad.zhineng = squadForm.value.zhineng
    squad.desc = squadForm.value.desc.trim()
  }
  showSquadModal.value = false
}

const confirmDeleteSquad = () => {
  const squadName = squadForm.value.name
  const teamName = activeTeamForSquad.value.name
  triggerConfirmModal(
    '刪除小隊',
    `確定刪除「${teamName} · ${squadName}」？刪除後可點團隊右側「添加小隊」恢復。`,
    () => {
      activeTeamForSquad.value.squads.splice(activeSquadIndex.value, 1)
      showSquadModal.value = false
    }
  )
}

// 席位配置 Modal
const showSlotModal = ref(false)
const activeTeamForSlot = ref(null)
const activeSquadForSlot = ref(null)
const activeSlot = ref(null)
const activeSlotIndex = ref(0)
const activeSkillDropdown = ref(null)

const slotForm = ref({
  liupai_list: [],
  zhineng_list: [],
  jueji_pz: '',
  qunxia_pz: '',
  zhuangbei_pz: '',
  desc: ''
})

const openSlotModal = (team, squad, slot, slotIdx) => {
  activeTeamForSlot.value = team
  activeSquadForSlot.value = squad
  activeSlot.value = slot
  activeSlotIndex.value = slotIdx
  activeSkillDropdown.value = null

  slotForm.value = {
    liupai_list: [...(slot.liupai_list || [])],
    zhineng_list: [...(slot.zhineng_list || [])],
    jueji_pz: slot.jueji_pz || '',
    qunxia_pz: slot.qunxia_pz || '',
    zhuangbei_pz: slot.zhuangbei_pz || '',
    desc: slot.desc || ''
  }
  showSlotModal.value = true
}

const closeSlotModal = () => {
  showSlotModal.value = false
  activeSkillDropdown.value = null
}

const closeAllSkillDropdowns = () => {
  activeSkillDropdown.value = null
}

const toggleSkillDropdown = (type) => {
  if (activeSkillDropdown.value === type) {
    activeSkillDropdown.value = null
  } else {
    activeSkillDropdown.value = type
  }
}

const toggleSlotSchool = (sName) => {
  const idx = slotForm.value.liupai_list.indexOf(sName)
  if (idx > -1) slotForm.value.liupai_list.splice(idx, 1)
  else slotForm.value.liupai_list.push(sName)
}

const toggleSlotRole = (rName) => {
  const idx = slotForm.value.zhineng_list.indexOf(rName)
  if (idx > -1) slotForm.value.zhineng_list.splice(idx, 1)
  else slotForm.value.zhineng_list.push(rName)
}

const selectJueji = (jName) => {
  slotForm.value.jueji_pz = jName
  activeSkillDropdown.value = null
}

const isQunxiaSelected = (qName) => {
  return slotForm.value.qunxia_pz.split(',').map(s => s.trim()).includes(qName)
}

const toggleQunxia = (qName) => {
  let list = slotForm.value.qunxia_pz ? slotForm.value.qunxia_pz.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(qName)
  if (idx > -1) list.splice(idx, 1)
  else list.push(qName)
  slotForm.value.qunxia_pz = list.join(', ')
}

const isLiupaiSelected = (lName) => {
  return slotForm.value.zhuangbei_pz.split(',').map(s => s.trim()).includes(lName)
}

const toggleLiupaiSkill = (lName) => {
  let list = slotForm.value.zhuangbei_pz ? slotForm.value.zhuangbei_pz.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(lName)
  if (idx > -1) list.splice(idx, 1)
  else list.push(lName)
  slotForm.value.zhuangbei_pz = list.join(', ')
}

const saveSlotModal = () => {
  if (activeSlot.value) {
    activeSlot.value.liupai_list = [...slotForm.value.liupai_list]
    activeSlot.value.zhineng_list = [...slotForm.value.zhineng_list]
    activeSlot.value.jueji_pz = slotForm.value.jueji_pz.trim()
    activeSlot.value.qunxia_pz = slotForm.value.qunxia_pz.trim()
    activeSlot.value.zhuangbei_pz = slotForm.value.zhuangbei_pz.trim()
    activeSlot.value.desc = slotForm.value.desc.trim()
  }
  showSlotModal.value = false
}

const clearSlot = (slot) => {
  slot.liupai_list = []
  slot.zhineng_list = []
  slot.jueji_pz = ''
  slot.qunxia_pz = ''
  slot.zhuangbei_pz = ''
  slot.desc = ''
}

const getSlotRoleText = (slot) => {
  if (slot.zhineng_list && slot.zhineng_list.length > 0) {
    return slot.zhineng_list.join(' / ')
  }
  return '未配置'
}

const getSlotCardStyle = (slot) => {
  if (slot.liupai_list && slot.liupai_list.length > 0) {
    const firstSchool = slot.liupai_list[0]
    const bg = schoolColorMap[firstSchool] || '#f1f5f9'
    return { backgroundColor: bg }
  }
  return { backgroundColor: '#f1f5f9' }
}

onMounted(() => {
  window.addEventListener('click', closeAllSkillDropdowns)
})

onUnmounted(() => {
  window.removeEventListener('click', closeAllSkillDropdowns)
})
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
.text-blue { color: #2563eb; }
.font-bold { font-weight: bold; }
.clickable-title { cursor: pointer; }
.clickable-title:hover { text-decoration: underline; }

.filter-bar { display: flex; align-items: center; gap: 12px; }
.search-input-wrapper { position: relative; width: 220px; display: flex; align-items: center; }
.search-icon { position: absolute; left: 8px; color: #94a3b8; font-size: 16px; }
.filter-search-input { width: 100%; padding: 6px 12px 6px 28px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; }
.count-text { font-size: 12px; color: #64748b; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

/* 編輯器內部佈局 */
.editor-header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; }
.back-title-group { display: flex; align-items: center; gap: 12px; }
.btn-back { background: none; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; color: #475569; }
.editing-tpl-name { font-size: 16px; font-weight: bold; color: #1e293b; }

.editor-top-actions { display: flex; align-items: center; gap: 10px; }
.switch-control { display: flex; align-items: center; gap: 8px; }
.switch-label-text { font-size: 12px; color: #475569; font-weight: bold; }

.teams-container { display: flex; flex-direction: column; gap: 24px; }
.team-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
.team-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.team-badge-btn { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: bold; color: #1e293b; cursor: pointer; display: flex; align-items: center; gap: 6px; }
.icon-sm { font-size: 14px; color: #94a3b8; }
.add-squad-btn { background: none; border: 1px dashed #3b82f6; color: #3b82f6; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; }

.squads-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 12px; }
.squad-card { background: #ffffff; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
.squad-card-head { display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-weight: bold; margin-bottom: 8px; cursor: pointer; padding: 2px 4px; border-radius: 4px; }
.squad-card-head:hover { background: #f1f5f9; }
.squad-name-label { color: #334155; }
.squad-cog-icon { color: #94a3b8; font-size: 14px; }

.slots-container { display: flex; flex-direction: column; gap: 6px; }
.slot-card { position: relative; display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; border-radius: 4px; border: 1px solid #cbd5e1; cursor: pointer; transition: all 0.15s; }
.slot-card:hover { border-color: #3b82f6; }
.slot-compact-body { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #1e293b; font-weight: 500; overflow: hidden; }
.slot-school-icons { display: flex; align-items: center; gap: 2px; }
.slot-icon-badge { width: 16px; height: 16px; object-fit: contain; }
.slot-role-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 詳情視圖樣式 */
.slot-card.detail-mode { flex-direction: column; align-items: flex-start; padding: 8px 10px; }
.slot-detail-body { display: flex; flex-direction: column; gap: 2px; width: 100%; font-size: 11px; color: #475569; }
.detail-head { display: flex; align-items: center; gap: 4px; font-weight: bold; color: #1e293b; margin-bottom: 4px; }
.detail-role-title { font-size: 12px; }
.detail-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.slot-remove-x { position: absolute; right: 6px; top: 6px; font-size: 14px; color: #94a3b8; cursor: pointer; font-weight: bold; opacity: 0; transition: opacity 0.15s; }
.slot-card:hover .slot-remove-x { opacity: 1; }
.slot-remove-x:hover { color: #ef4444; }

/* Modal 彈窗與元件 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.small-card { width: 380px; }
.medium-card { width: 480px; }
.slot-modal-card { width: 560px; max-height: 85vh; overflow-y: auto; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row.align-start { align-items: flex-start; }
.form-row label { width: 80px; font-weight: bold; }
.form-row input[type="text"], .form-row select { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.req { color: #ef4444; }

.input-with-counter { position: relative; flex: 1; display: flex; align-items: center; }
.counter-input { width: 100%; padding: 6px 60px 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; box-sizing: border-box; outline: none; }
.input-char-counter { position: absolute; right: 10px; font-size: 11px; color: #94a3b8; pointer-events: none; }

.textarea-wrapper { position: relative; flex: 1; display: flex; flex-direction: column; }
.skill-textarea { width: 100%; height: 80px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; resize: none; box-sizing: border-box; outline: none; }
.skill-textarea.h-60 { height: 60px; }
.skill-textarea.h-80 { height: 80px; }
.char-counter { position: absolute; right: 10px; bottom: 8px; font-size: 11px; color: #94a3b8; pointer-events: none; }

.danger-zone { display: flex; justify-content: flex-end; padding-top: 8px; border-top: 1px solid #f1f5f9; }
.text-gray-val { font-size: 13px; color: #475569; font-weight: 500; }

/* 席位配置 Modal (膠囊圖示按鈕對齊圖一/圖二) */
.slot-location-tag { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }
.form-block { display: flex; flex-direction: column; gap: 8px; }
.block-title { font-weight: bold; font-size: 13px; color: #1e293b; }
.sub-hint { font-size: 11px; color: #94a3b8; line-height: 1.4; }

.school-pills-group { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
.school-btn-card { border: 1px solid #cbd5e1; background: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.school-btn-card.active { border-color: var(--badge-color); background: var(--badge-bg); color: var(--badge-color); font-weight: bold; }
.btn-img-icon { width: 18px; height: 18px; object-fit: contain; }

.role-tag-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.role-tag-btn { background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; color: #475569; transition: all 0.15s; }
.role-tag-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; font-weight: bold; }

.skill-input-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.skill-input-row label { width: 80px; font-weight: bold; color: #334155; }

/* 技能輸入框與右側下拉按鈕 */
.custom-dropdown-container { position: relative; flex: 1; display: flex; align-items: center; }
.skill-input-field { width: 100%; padding: 6px 30px 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; }
.dropdown-toggle-btn { position: absolute; right: 4px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px 6px; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.dropdown-toggle-btn i { transition: transform 0.2s; }
.dropdown-toggle-btn i.rotate { transform: rotate(180deg); }

.skill-dropdown-panel { position: absolute; top: 100%; left: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 160px; overflow-y: auto; z-index: 120; padding: 4px 0; }
.dropdown-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 13px; cursor: pointer; color: #334155; }
.dropdown-item:hover { background: #f1f5f9; }
.dropdown-item.selected { color: #2563eb; font-weight: bold; background: #eff6ff; }
.check-icon { font-size: 16px; color: #2563eb; }

/* 置中刪除確認 Modal */
.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

/* Switch 開關樣式 */
.switch { position: relative; display: inline-block; width: 34px; height: 18px; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 18px; }
.slider:before { position: absolute; content: ""; height: 14px; width: 14px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider { background-color: #3b82f6; }
input:checked + .slider:before { transform: translateX(16px); }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.margin-b { margin-bottom: 15px; }
.margin-t { margin-top: 10px; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }
</style>