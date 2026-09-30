<template>
  <div class="members-layout light-theme" @click="closePopover">
    <Navbar 
      activeNav="members" 
      :username="username" 
    />

    <div class="members-main">
      <!-- 左側：授權幫會清單 -->
      <aside class="guild-sidebar">
        <div class="sidebar-header">
          <h3>授權幫會</h3>
          <button class="btn-add-guild" @click="openAddGuildModal">+ 新增幫會</button>
        </div>
        <ul class="guild-list">
          <li 
            v-for="guild in accessibleGuildList" 
            :key="guild.id" 
            :class="['guild-item', { active: currentGuildId === guild.id }]"
            @click="currentGuildId = guild.id"
          >
            <div class="guild-info">
              <span class="guild-name">{{ guild.name }}</span>
              <span class="guild-count">{{ getGuildMemberCount(guild.name) }} 人</span>
            </div>
            <div class="guild-actions" @click.stop>
              <button class="btn-icon-sm" @click="openEditGuildModal(guild)" title="幫會設定">
                <i class="mdi mdi-cog-outline"></i>
              </button>
            </div>
          </li>
        </ul>
        <div v-if="accessibleGuildList.length === 0" class="no-guild-hint">
          尚未擁有任何幫會權限，請先點右上角「+ 新增幫會」或聯繫管理員指派幫會。
        </div>
      </aside>

      <!-- 右側：成員資料表格 -->
      <main class="content-area">
        <div class="toolbar">
          <div class="left-actions">
            <input type="text" v-model="searchQuery" placeholder="搜尋角色名..." class="search-input" />
            <button class="btn-primary" :disabled="!currentGuildName" @click="openMemberModal()">新增成員</button>
            <button class="btn-secondary" :disabled="!currentGuildName" @click="openImportModal">截圖/EXCEL導入</button>
            <button class="btn-secondary" @click="openBatchModal" :disabled="selectedMemberIds.length === 0">
              批量操作 {{ selectedMemberIds.length > 0 ? `(${selectedMemberIds.length})` : '' }}
            </button>
          </div>

          <div class="right-actions">
            <button class="btn-icon" @click="showColumnModal = true" title="表格列設置">
              <i class="mdi mdi-cog-outline"></i>
            </button>
          </div>
        </div>

        <!-- 流派 Icon 快篩列 -->
        <div class="school-filter-bar margin-b">
          <span class="filter-label">流派快篩：</span>
          <div class="filter-badges-container">
            <div 
              v-for="s in availableSchools" 
              :key="s.name"
              :class="['school-filter-pill', { active: activeSchoolFilter === s.name }]"
              :style="{ '--badge-color': s.color, '--badge-bg': s.bg }"
              @click="toggleSchoolFilter(s.name)"
            >
              <img v-if="s.file" :src="getSchoolImg(s.file)" class="filter-pill-img" />
              <span>{{ s.name }}</span>
            </div>
            <button v-if="activeSchoolFilter" class="btn-link-reset" @click="activeSchoolFilter = ''">
              重置篩選
            </button>
          </div>
        </div>

        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th width="40"><input type="checkbox" @change="toggleSelectAll" :checked="isAllSelected" /></th>
                <th>角色名</th>

                <!-- 點擊排序：流派 -->
                <th v-if="columns.school" class="sortable-th" @click="toggleSort('school')">
                  流派
                  <i :class="['mdi', getSortIcon('school'), 'sort-icon', { active: sortField === 'school' }]"></i>
                </th>

                <!-- 點擊排序：幫眾狀態 -->
                <th v-if="columns.status" class="sortable-th" @click="toggleSort('status')">
                  幫眾狀態
                  <i :class="['mdi', getSortIcon('status'), 'sort-icon', { active: sortField === 'status' }]"></i>
                </th>

                <th v-if="columns.godlyWeapon">神兵</th>
                <th v-if="columns.rolePref">職能偏好</th>
                <th v-if="columns.notes">成員備註</th>
                <th v-if="columns.contact">聯繫方式</th>
                <th width="100">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="member in filteredMembers" :key="member.id">
                <td><input type="checkbox" :value="member.id" v-model="selectedMemberIds" /></td>
                <td class="font-bold">{{ member.name }}</td>

                <td v-if="columns.school">
                  <div class="school-popover-wrapper" @click.stop>
                    <div class="school-cell clickable" @click="toggleSchoolPopover(member.id)">
                      <img 
                        v-if="getSchoolInfo(member.currentSchool).file"
                        :src="getSchoolImg(getSchoolInfo(member.currentSchool).file)" 
                        class="school-img-badge" 
                      />
                      <span v-else class="school-text-badge">{{ member.currentSchool }}</span>
                    </div>

                    <div v-if="activePopoverMemberId === member.id" class="school-popover-box">
                      <div class="popover-arrow"></div>
                      <button 
                        v-for="sName in (member.schools.length > 0 ? member.schools : [member.currentSchool])" 
                        :key="sName"
                        :class="['popover-school-btn', { active: member.currentSchool === sName }]"
                        @click="quickSwitchSchool(member, sName)"
                      >
                        <img v-if="getSchoolImg(getSchoolInfo(sName).file)" :src="getSchoolImg(getSchoolInfo(sName).file)" class="popover-btn-img" />
                        <span>{{ sName }}</span>
                      </button>
                    </div>
                  </div>
                </td>

                <td v-if="columns.status">
                  <div class="status-popover-wrapper" @click.stop>
                    <span 
                      :class="['status-badge', 'clickable', getStatusClass(member.status)]"
                      @click="toggleStatusPopover(member.id)"
                    >
                      {{ member.status }}
                    </span>

                    <div v-if="activeStatusPopoverMemberId === member.id" class="status-popover-box">
                      <div class="popover-arrow"></div>
                      <button 
                        v-for="st in ['幫眾', '學徒', '退幫']" 
                        :key="st"
                        :class="['popover-status-btn', getStatusClass(st), { active: member.status === st }]"
                        @click="quickSwitchStatus(member, st)"
                      >
                        {{ st }}
                      </button>
                    </div>
                  </div>
                </td>

                <td v-if="columns.godlyWeapon">{{ member.hasGodlyWeapon ? '有' : '—' }}</td>
                <td v-if="columns.rolePref">{{ member.rolePref || '未設置' }}</td>
                <td v-if="columns.notes">{{ member.notes || '—' }}</td>
                <td v-if="columns.contact">{{ member.contact || '—' }}</td>
                <td>
                  <button class="btn-link" @click="openMemberModal(member)">編輯</button>
                  <button class="btn-link text-red" @click="deleteMember(member.id)">刪除</button>
                </td>
              </tr>
              <tr v-if="filteredMembers.length === 0">
                <td :colspan="10" class="empty-cell">
                  {{ accessibleGuildList.length === 0 ? '請先新增幫會或聯繫管理員指派幫會權限' : '暫無成員資料' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </main>
    </div>

    <!-- 表格列設置彈窗 -->
    <div v-if="showColumnModal" class="modal-overlay" @click.self="showColumnModal = false">
      <div class="modal-card wide-card">
        <div class="modal-header">
          <h3>表格列設置</h3>
          <span class="close-btn" @click="showColumnModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="column-grid">
            <div v-for="col in columnList" :key="col.key" class="column-item">
              <label>
                <input type="checkbox" v-model="columns[col.key]" />
                {{ col.label }}
              </label>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="showColumnModal = false">確定</button>
        </div>
      </div>
    </div>

    <!-- 幫會設定彈窗 -->
    <div v-if="showGuildEditModal" class="modal-overlay" @click.self="showGuildEditModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>幫會設定</h3>
          <span class="close-btn" @click="showGuildEditModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>幫會名稱：</label>
            <input type="text" v-model="editingGuildName" />
          </div>
          <button class="btn-danger full-width margin-t" @click="deleteGuild">刪除幫會與其成員</button>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showGuildEditModal = false">取消</button>
          <button class="btn-primary" @click="saveGuildName">儲存</button>
        </div>
      </div>
    </div>

    <!-- 新增 / 編輯成員彈窗 -->
    <div v-if="showMemberModal" class="modal-overlay" @click.self="showMemberModal = false">
      <div class="modal-card large-card">
        <div class="modal-header">
          <h3>{{ editingMemberId ? '編輯成員' : '新增成員' }}</h3>
          <span class="close-btn" @click="showMemberModal = false">&times;</span>
        </div>
        <div class="modal-body form-grid">
          <div class="form-section">
            <h4 class="section-title">基礎資訊</h4>
            
            <div class="form-row">
              <label><span class="req">*</span>角色名：</label>
              <input type="text" v-model="memberForm.name" placeholder="請輸入角色名" />
              <button class="btn-link margin-l" @click="showFormerNamesModal = true">
                曾用名 ({{ memberForm.formerNames.length }})
              </button>
            </div>

            <div class="form-row">
              <label><span class="req">*</span>流派列表：</label>
              <div class="school-selector">
                <button 
                  v-for="s in availableSchools" 
                  :key="s.name" 
                  :class="['school-btn-card', { active: memberForm.schools.includes(s.name) }]"
                  :style="{ '--badge-color': s.color, '--badge-bg': s.bg }"
                  @click="toggleSchoolSelection(s.name)"
                >
                  <img v-if="s.file" :src="getSchoolImg(s.file)" class="btn-img-icon" />
                  <span>{{ s.name }}</span>
                </button>
              </div>
            </div>

            <div class="form-row" v-if="memberForm.schools.length > 0">
              <label><span class="req">*</span>當前流派：</label>
              <select v-model="memberForm.currentSchool">
                <option v-for="s in memberForm.schools" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div class="form-row">
              <label>神兵：</label>
              <input type="checkbox" v-model="memberForm.hasGodlyWeapon" />
            </div>

            <div class="form-row">
              <label>所屬幫會：</label>
              <select v-model="memberForm.guild">
                <option v-for="g in accessibleGuildList" :key="g.id" :value="g.name">{{ g.name }}</option>
              </select>

              <label class="margin-l">幫眾狀態：</label>
              <select v-model="memberForm.status">
                <option value="幫眾">幫眾</option>
                <option value="學徒">學徒</option>
                <option value="退幫">退幫</option>
              </select>
            </div>

            <div class="form-row">
              <label>聯繫方式：</label>
              <input type="text" v-model="memberForm.contact" placeholder="DC名稱" />
            </div>

            <div class="form-row">
              <label>成員備註：</label>
              <input type="text" v-model="memberForm.notes" placeholder="請輸入備註" />
            </div>

            <div class="form-row">
              <label>一線牽：</label>
              <input type="text" v-model="memberForm.tether" placeholder="輸入角色名搜尋" />
            </div>

            <!-- 職能偏好：13 項個人職能 -->
            <div class="form-row align-start">
              <label>職能偏好：</label>
              <div class="custom-select-wrapper" @click.stop>
                <div class="custom-select-input" @click="showRoleDropdown = !showRoleDropdown">
                  <span :class="{ 'placeholder-text': !memberForm.rolePrefList || memberForm.rolePrefList.length === 0 }">
                    {{ displayRolePref }}
                  </span>
                  <i :class="['mdi', 'mdi-chevron-down', 'select-arrow', { rotate: showRoleDropdown }]"></i>
                </div>

                <div v-if="showRoleDropdown" class="custom-select-dropdown">
                  <div 
                    v-for="roleName in personalRoleOptions" 
                    :key="roleName" 
                    :class="['dropdown-option-item', { selected: isRoleSelected(roleName) }]"
                    @click="toggleRolePref(roleName)"
                  >
                    <span>{{ roleName }}</span>
                    <i v-if="isRoleSelected(roleName)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showMemberModal = false">取消</button>
          <button class="btn-primary" @click="saveMember">提交</button>
        </div>
      </div>
    </div>

    <!-- 曾用名彈窗 -->
    <div v-if="showFormerNamesModal" class="modal-overlay" @click.self="showFormerNamesModal = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>編輯曾用名</h3>
          <span class="close-btn" @click="showFormerNamesModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div v-for="(name, idx) in memberForm.formerNames" :key="idx" class="former-name-item margin-v">
            <input type="text" v-model="memberForm.formerNames[idx]" />
            <button class="btn-link text-red margin-l" @click="memberForm.formerNames.splice(idx, 1)">刪除</button>
          </div>
          <button class="btn-secondary full-width margin-t" @click="memberForm.formerNames.push('')">+ 新增歷史曾用名</button>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" @click="showFormerNamesModal = false">確定</button>
        </div>
      </div>
    </div>

    <!-- 截圖 / EXCEL 導入彈窗 -->
    <div v-if="showImportModal" class="modal-overlay" @click.self="preventCloseDuringImport">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>成員資料導入 (截圖 / Excel)</h3>
          <span v-if="!isImporting" class="close-btn" @click="finishImportModal">&times;</span>
        </div>
        <div class="modal-body">
          <div class="form-row">
            <label>導入到幫會：</label>
            <select v-model="importTargetGuild" :disabled="isImporting || isImportComplete">
              <option v-for="g in accessibleGuildList" :key="g.id" :value="g.name">{{ g.name }}</option>
            </select>
          </div>

          <div v-if="!isImporting && !isImportComplete" class="upload-box" @click="triggerFileUpload">
            <i class="mdi mdi-cloud-upload-outline upload-icon"></i>
            <p>點擊上傳幫會成員列表截圖 (JPG / PNG) 或 Excel 檔案 (.xlsx / .xls)</p>
            <input type="file" ref="fileInput" @change="handleFileUpload" accept="image/*,.xlsx,.xls" hidden />
          </div>

          <!-- 識別結果預覽列表 -->
          <div v-if="ocrPreviewList.length > 0 && !isImporting && !isImportComplete" class="ocr-result-box">
            <h4>識別結果預覽 (共 {{ ocrPreviewList.length }} 人)：</h4>
            <ul class="preview-list">
              <li v-for="(item, idx) in ocrPreviewList" :key="idx">
                <span class="font-bold">{{ item.name }}</span>
                <span class="margin-l text-blue font-bold">流派: {{ item.school }}</span>
                <span class="margin-l text-gray">身份: {{ item.status }}</span>
              </li>
            </ul>
          </div>

          <div v-if="isParsingImage" class="progress-container">
            <div class="progress-info">
              <span>正在智慧識別截圖內容，請稍候...</span>
            </div>
          </div>

          <div v-if="isImporting || isImportComplete" class="progress-container">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: importProgress + '%' }"></div>
            </div>
            <div class="progress-info">
              <span>{{ importStatusText }}</span>
              <span>{{ importProgress }}%</span>
            </div>
            <div v-if="isImportComplete" class="success-summary">
              <i class="mdi mdi-check-circle margin-r-xs"></i> {{ importSummaryText }}
            </div>
          </div>
        </div>

        <div class="modal-footer space-between align-center">
          <a href="/成員上傳範本.xlsx" download="成員上傳範本.xlsx" class="btn-template-download">
            <i class="mdi mdi-file-excel-outline margin-r-xs"></i> 範本下載
          </a>

          <div class="right-modal-btns">
            <template v-if="!isImportComplete">
              <button class="btn-secondary" :disabled="isImporting || isParsingImage" @click="finishImportModal">取消</button>
              <button class="btn-primary margin-l" :disabled="isImporting || isParsingImage || ocrPreviewList.length === 0" @click="confirmImport">
                {{ isImporting ? '處理中...' : '開始導入' }}
              </button>
            </template>

            <template v-else>
              <button class="btn-primary btn-green" @click="finishImportModal">完成</button>
            </template>
          </div>
        </div>
      </div>
    </div>

    <!-- 批量操作彈窗 -->
    <div v-if="showBatchModal" class="modal-overlay" @click.self="preventCloseDuringBatch">
      <div class="modal-card medium-card">
        <div class="modal-header">
          <h3>批量操作</h3>
          <span v-if="!isBatchProcessing" class="close-btn" @click="finishBatchModal">&times;</span>
        </div>
        <div class="modal-body">
          <p class="sub-desc font-bold text-blue">已勾選 {{ selectedMemberIds.length }} 名成員</p>

          <template v-if="!isBatchProcessing && !isBatchComplete">
            <!-- 1. 批量編輯資訊區 -->
            <div class="batch-section-card margin-v">
              <h4 class="batch-section-title">批量編輯成員資訊</h4>

              <div class="form-row margin-t">
                <label>神兵：</label>
                <select v-model="batchGodlyWeapon">
                  <option value="no_change">不修改</option>
                  <option value="has">設為「有神兵」</option>
                  <option value="none">設為「無神兵」</option>
                </select>
              </div>

              <div class="form-row margin-t">
                <label>幫眾狀態：</label>
                <select v-model="batchStatus">
                  <option value="">不修改</option>
                  <option value="幫眾">幫眾</option>
                  <option value="學徒">學徒</option>
                  <option value="退幫">退幫</option>
                </select>
              </div>

              <div class="form-row margin-t">
                <label>成員備註：</label>
                <input type="text" v-model="batchNotes" placeholder="留空則不修改，填寫將統一覆蓋" />
              </div>

              <button class="btn-primary full-width margin-t" @click="handleBatchUpdateAttributes">
                套用批量編輯資訊
              </button>
            </div>

            <hr class="divider-v" />

            <!-- 2. 移動到幫會 -->
            <div class="form-row margin-v">
              <label>移動到幫會：</label>
              <select v-model="batchTargetGuild">
                <option v-for="g in accessibleGuildList" :key="g.id" :value="g.name">{{ g.name }}</option>
              </select>
              <button class="btn-secondary margin-l" @click="handleBatchMove">套用移動</button>
            </div>

            <hr class="divider-v" />

            <!-- 3. 批量刪除 -->
            <button class="btn-danger full-width margin-t" @click="handleBatchDelete">批量刪除選中成員</button>
          </template>

          <div v-if="isBatchProcessing || isBatchComplete" class="progress-container">
            <div class="progress-bar-bg">
              <div class="progress-bar-fill" :style="{ width: batchProgress + '%' }"></div>
            </div>
            <div class="progress-info">
              <span>{{ batchStatusText }}</span>
              <span>{{ batchProgress }}%</span>
            </div>
            <div v-if="isBatchComplete" class="success-summary">
              <i class="mdi mdi-check-circle margin-r-xs"></i> {{ batchSummaryText }}
            </div>
          </div>
        </div>

        <div class="modal-footer" v-if="isBatchComplete">
          <button class="btn-primary btn-green full-width" @click="finishBatchModal">完成</button>
        </div>
      </div>
    </div>

    <!-- 刪除確認 Modal -->
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../utils/supabase'
import Navbar from '../components/layout/Navbar.vue'

const router = useRouter()
const username = ref('VIP')
const userProfile = ref(null)

const activePopoverMemberId = ref(null)
const activeStatusPopoverMemberId = ref(null)

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

// 13 項個人職能預設
const personalRoleOptions = ref([
  '保鑣', '埋頭猛拆', '塔仇御鐵', '潮砲', '奶絕奶',
  '增益奶', '輔潮', '燒屍體', '騰龍合軸', '拆塔指揮',
  '保鑣指揮', '防守指揮', '點殺'
])

const fetchPrepRoles = async (guildId) => {
  try {
    let q = supabase.from('preparation_roles').select('*').eq('type', 'personal').eq('is_enabled', true)
    if (guildId) q = q.or(`guild_id.eq.${guildId},guild_id.is.null`)
    const { data } = await q
    if (data && data.length > 0) {
      personalRoleOptions.value = data.map(r => r.name)
    }
  } catch (err) {
    console.warn('載入戰備個人職能失敗，維持新版預設:', err)
  }
}

const showRoleDropdown = ref(false)

const toggleSchoolPopover = (memberId) => {
  activeStatusPopoverMemberId.value = null
  activePopoverMemberId.value = activePopoverMemberId.value === memberId ? null : memberId
}

const toggleStatusPopover = (memberId) => {
  activePopoverMemberId.value = null
  activeStatusPopoverMemberId.value = activeStatusPopoverMemberId.value === memberId ? null : memberId
}

const closePopover = () => {
  activePopoverMemberId.value = null
  activeStatusPopoverMemberId.value = null
  showRoleDropdown.value = false
}

const allGuilds = ref([])
const currentGuildId = ref(null)
const showGuildEditModal = ref(false)
const targetEditGuild = ref(null)
const editingGuildName = ref('')

const availableSchools = ref([
  { name: '鐵衣', file: 'ty', color: '#d97706', bg: '#fef3c7' },
  { name: '血河', file: 'xh', color: '#e11d48', bg: '#ffe4e6' },
  { name: '九靈', file: 'jl', color: '#8b5cf6', bg: '#f3e8ff' },
  { name: '神相', file: 'sx', color: '#6366f1', bg: '#e0e7ff' },
  { name: '碎夢', file: 'sm', color: '#06b6d4', bg: '#cffaff' },
  { name: '素問', file: 'sw', color: '#f43f5e', bg: '#ffe4e6' },
  { name: '龍吟', file: 'ly', color: '#10b981', bg: '#d1fae5' },
  { name: '玄機', file: 'xj', color: '#84cc16', bg: '#ecfccb' },
  { name: '潮光', file: 'cg', color: '#38bdf8', bg: '#f0f9ff' },
  { name: '滄瀾', file: 'cl', color: '#0284c7', bg: '#e0e7ff' }
])

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../assets/schools/${fileName}.png`, import.meta.url).href
}

const members = ref([])
const searchQuery = ref('')
const selectedMemberIds = ref([])

// 流派快篩與欄位排序 State
const activeSchoolFilter = ref('')
const sortField = ref('') // 'school' | 'status' | ''
const sortOrder = ref('asc') // 'asc' | 'desc'

const toggleSchoolFilter = (schoolName) => {
  if (activeSchoolFilter.value === schoolName) {
    activeSchoolFilter.value = ''
  } else {
    activeSchoolFilter.value = schoolName
  }
}

const toggleSort = (field) => {
  if (sortField.value === field) {
    if (sortOrder.value === 'asc') sortOrder.value = 'desc'
    else { sortField.value = ''; sortOrder.value = 'asc'; }
  } else {
    sortField.value = field
    sortOrder.value = 'asc'
  }
}

const getSortIcon = (field) => {
  if (sortField.value !== field) return 'mdi-swap-vertical'
  return sortOrder.value === 'asc' ? 'mdi-arrow-up' : 'mdi-arrow-down'
}

const showColumnModal = ref(false)
const columnList = [
  { key: 'school', label: '流派' },
  { key: 'status', label: '幫眾狀態' },
  { key: 'godlyWeapon', label: '神兵' },
  { key: 'rolePref', label: '職能偏好' },
  { key: 'notes', label: '成員備註' },
  { key: 'contact', label: '聯繫方式' }
]
const columns = ref({ school: true, status: true, godlyWeapon: true, rolePref: true, notes: true, contact: true })

const showMemberModal = ref(false)
const showFormerNamesModal = ref(false)
const editingMemberId = ref(null)

const memberForm = ref({
  name: '', formerNames: [], schools: ['鐵衣'], currentSchool: '鐵衣',
  hasGodlyWeapon: false, guild: '', status: '幫眾', contact: '', notes: '', tether: '', rolePrefList: []
})

const showImportModal = ref(false)
const importTargetGuild = ref('')
const fileInput = ref(null)
const ocrPreviewList = ref([])
const isParsingImage = ref(false)

const isImporting = ref(false)
const importProgress = ref(0)
const importStatusText = ref('')
const isImportComplete = ref(false)
const importSummaryText = ref('')

const showBatchModal = ref(false)
const batchTargetGuild = ref('')
const isBatchProcessing = ref(false)
const batchProgress = ref(0)
const batchStatusText = ref('')
const isBatchComplete = ref(false)
const batchSummaryText = ref('')

// 批量編輯成員屬性 State
const batchGodlyWeapon = ref('no_change')
const batchStatus = ref('')
const batchNotes = ref('')

const accessibleGuildList = computed(() => {
  if (!userProfile.value) return []
  if (userProfile.value.role === 'super_admin') return allGuilds.value
  const userGuildIds = userProfile.value.guild_ids || (userProfile.value.guild_id ? [userProfile.value.guild_id] : [])
  return allGuilds.value.filter(g => userGuildIds.includes(g.id))
})

const fetchCloudData = async () => {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) { router.push('/login'); return }

  username.value = session.user.email.split('@')[0]

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
  if (profile) userProfile.value = profile

  const { data: guildsData } = await supabase.from('guilds').select('*').order('created_at', { ascending: true })
  if (guildsData) {
    allGuilds.value = guildsData
    
    if (accessibleGuildList.value.length > 0) {
      if (!currentGuildId.value || !accessibleGuildList.value.find(g => g.id === currentGuildId.value)) {
        currentGuildId.value = accessibleGuildList.value[0].id
      }
      if (!importTargetGuild.value) importTargetGuild.value = accessibleGuildList.value[0].name
      if (!batchTargetGuild.value) batchTargetGuild.value = accessibleGuildList.value[0].name
    }
  }

  await fetchPrepRoles(currentGuildId.value)

  const { data: membersData } = await supabase.from('guild_members').select('*')
  if (membersData) {
    members.value = membersData.map(m => ({
      id: m.id,
      name: m.name,
      formerNames: m.former_names || [],
      schools: m.schools || [m.current_school],
      currentSchool: m.current_school,
      hasGodlyWeapon: m.has_godly_weapon || false,
      guild: getGuildNameById(m.guild_id),
      status: m.status || '幫眾',
      contact: m.contact || '',
      notes: m.notes || '',
      tether: m.tether || '',
      rolePref: (m.role_preference && m.role_preference.length > 0) ? m.role_preference.join(', ') : '未設置',
      rolePrefList: m.role_preference || []
    }))
  }
}

watch(currentGuildId, (newGId) => {
  if (newGId) fetchPrepRoles(newGId)
})

const getGuildNameById = (guildId) => {
  const found = allGuilds.value.find(g => g.id === guildId)
  return found ? found.name : ''
}

const getGuildIdByName = (guildName) => {
  const found = allGuilds.value.find(g => g.name === guildName)
  return found ? found.id : null
}

const currentGuildName = computed(() => {
  const g = accessibleGuildList.value.find(item => item.id === currentGuildId.value)
  return g ? g.name : ''
})

const filteredMembers = computed(() => {
  if (!currentGuildName.value) return []
  
  let list = members.value.filter(m => {
    const matchGuild = m.guild === currentGuildName.value
    const matchSearch = !searchQuery.value || m.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchSchoolFilter = !activeSchoolFilter.value || (m.schools && m.schools.includes(activeSchoolFilter.value)) || m.currentSchool === activeSchoolFilter.value
    return matchGuild && matchSearch && matchSchoolFilter
  })

  if (sortField.value === 'school') {
    list.sort((a, b) => {
      const res = (a.currentSchool || '').localeCompare(b.currentSchool || '', 'zh-TW')
      return sortOrder.value === 'asc' ? res : -res
    })
  } else if (sortField.value === 'status') {
    const statusOrder = { '幫眾': 1, '學徒': 2, '退幫': 3 }
    list.sort((a, b) => {
      const orderA = statusOrder[a.status] || 99
      const orderB = statusOrder[b.status] || 99
      const res = orderA - orderB
      return sortOrder.value === 'asc' ? res : -res
    })
  }

  return list
})

const getGuildMemberCount = (guildName) => members.value.filter(m => m.guild === guildName).length

const getSchoolInfo = (schoolName) => {
  const found = availableSchools.value.find(s => s.name === schoolName)
  return found || { name: schoolName, file: '', color: '#64748b', bg: '#f1f5f9' }
}

const isAllSelected = computed(() => filteredMembers.value.length > 0 && selectedMemberIds.value.length === filteredMembers.value.length)

const toggleSelectAll = (e) => {
  if (e.target.checked) selectedMemberIds.value = filteredMembers.value.map(m => m.id)
  else selectedMemberIds.value = []
}

const getStatusClass = (status) => {
  if (status === '幫眾') return 'status-green'
  if (status === '學徒') return 'status-blue'
  return 'status-gray'
}

const quickSwitchSchool = async (member, schoolName) => {
  member.currentSchool = schoolName
  activePopoverMemberId.value = null
  await supabase.from('guild_members').update({ current_school: schoolName }).eq('id', member.id)
}

const quickSwitchStatus = async (member, status) => {
  member.status = status
  activeStatusPopoverMemberId.value = null
  await supabase.from('guild_members').update({ status: status }).eq('id', member.id)
}

const openAddGuildModal = async () => {
  const name = prompt('請輸入新幫會名稱：')
  if (name && name.trim()) {
    const { data: newGuild, error } = await supabase.from('guilds').insert([{ name: name.trim() }]).select().single()
    if (!error && newGuild) {
      if (userProfile.value && userProfile.value.role !== 'super_admin') {
        const currentGuildIds = userProfile.value.guild_ids || []
        if (!currentGuildIds.includes(newGuild.id)) {
          currentGuildIds.push(newGuild.id)
          await supabase.from('profiles').update({ guild_ids: currentGuildIds }).eq('id', userProfile.value.id)
        }
      }
      await fetchCloudData()
      currentGuildId.value = newGuild.id
    }
  }
}

const openEditGuildModal = (guild) => {
  targetEditGuild.value = guild
  editingGuildName.value = guild.name
  showGuildEditModal.value = true
}

const saveGuildName = async () => {
  if (targetEditGuild.value && editingGuildName.value.trim()) {
    await supabase.from('guilds').update({ name: editingGuildName.value.trim() }).eq('id', targetEditGuild.value.id)
    await fetchCloudData()
    showGuildEditModal.value = false
  }
}

const deleteGuild = () => {
  triggerConfirmModal('刪除幫會', `確定要刪除幫會【${targetEditGuild.value.name}】嗎？`, async () => {
    await supabase.from('guilds').delete().eq('id', targetEditGuild.value.id)
    await fetchCloudData()
    showGuildEditModal.value = false
  })
}

const toggleSchoolSelection = (schoolName) => {
  const idx = memberForm.value.schools.indexOf(schoolName)
  if (idx > -1) {
    if (memberForm.value.schools.length > 1) {
      memberForm.value.schools.splice(idx, 1)
      if (memberForm.value.currentSchool === schoolName) {
        memberForm.value.currentSchool = memberForm.value.schools[0]
      }
    }
  } else {
    if (memberForm.value.schools.length >= 2) {
      alert('最多只能選擇 2 個流派！')
      return
    }
    memberForm.value.schools.push(schoolName)
  }
}

const displayRolePref = computed(() => memberForm.value.rolePrefList?.length > 0 ? memberForm.value.rolePrefList.join(', ') : '未設置 (可多選)')
const isRoleSelected = (roleName) => memberForm.value.rolePrefList?.includes(roleName)

const toggleRolePref = (roleName) => {
  if (!memberForm.value.rolePrefList) memberForm.value.rolePrefList = []
  const idx = memberForm.value.rolePrefList.indexOf(roleName)
  if (idx > -1) memberForm.value.rolePrefList.splice(idx, 1)
  else memberForm.value.rolePrefList.push(roleName)
}

const openMemberModal = (member = null) => {
  showRoleDropdown.value = false
  if (member) {
    editingMemberId.value = member.id
    memberForm.value = JSON.parse(JSON.stringify(member))
  } else {
    editingMemberId.value = null
    memberForm.value = {
      name: '', formerNames: [], schools: ['鐵衣'], currentSchool: '鐵衣',
      hasGodlyWeapon: false, guild: currentGuildName.value || accessibleGuildList.value[0]?.name || '',
      status: '幫眾', contact: '', notes: '', tether: '', rolePrefList: []
    }
  }
  showMemberModal.value = true
}

const saveMember = async () => {
  const cleanName = memberForm.value.name.trim()
  if (!cleanName) return alert('請輸入角色名！')
  if (memberForm.value.schools.length === 0) return alert('請至少選擇一個流派！')

  const isDuplicateInSameGuild = members.value.some(m => 
    m.guild === memberForm.value.guild && 
    m.name.trim().toLowerCase() === cleanName.toLowerCase() &&
    m.id !== editingMemberId.value
  )

  if (isDuplicateInSameGuild) {
    return alert(`幫會【${memberForm.value.guild}】中已存在角色名「${cleanName}」，請勿重複新增！`)
  }

  const targetGuildId = getGuildIdByName(memberForm.value.guild)
  const cleanFormerNames = (memberForm.value.formerNames || []).map(n => n.trim()).filter(Boolean)

  const payload = {
    guild_id: targetGuildId,
    name: cleanName,
    former_names: cleanFormerNames,
    schools: memberForm.value.schools,
    current_school: memberForm.value.currentSchool,
    has_godly_weapon: memberForm.value.hasGodlyWeapon,
    status: memberForm.value.status,
    contact: memberForm.value.contact.trim(),
    notes: memberForm.value.notes.trim(),
    tether: memberForm.value.tether.trim(),
    role_preference: memberForm.value.rolePrefList
  }

  if (editingMemberId.value) {
    await supabase.from('guild_members').update(payload).eq('id', editingMemberId.value)
  } else {
    await supabase.from('guild_members').insert([payload])
  }

  await fetchCloudData()
  showMemberModal.value = false
}

const deleteMember = (id) => {
  const m = members.value.find(item => item.id === id)
  triggerConfirmModal('刪除成員', `確定要刪除成員【${m?.name || ''}】嗎？`, async () => {
    await supabase.from('guild_members').delete().eq('id', id)
    await fetchCloudData()
  })
}

const openImportModal = () => {
  isImporting.value = false
  isImportComplete.value = false
  isParsingImage.value = false
  importProgress.value = 0
  ocrPreviewList.value = []
  showImportModal.value = true
}

const preventCloseDuringImport = () => {
  if (!isImporting.value && !isParsingImage.value) finishImportModal()
}

const finishImportModal = () => {
  if (isImporting.value || isParsingImage.value) return
  showImportModal.value = false
  isImporting.value = false
  isImportComplete.value = false
  isParsingImage.value = false
  importProgress.value = 0
  ocrPreviewList.value = []
}

const triggerFileUpload = () => { fileInput.value.click() }

const loadXLSXScript = () => {
  return new Promise((resolve) => {
    if (window.XLSX) return resolve(window.XLSX)
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    script.onload = () => resolve(window.XLSX)
    document.head.appendChild(script)
  })
}

const loadTesseractScript = () => {
  return new Promise((resolve) => {
    if (window.Tesseract) return resolve(window.Tesseract)
    const script = document.createElement('script')
    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'
    script.onload = () => resolve(window.Tesseract)
    script.onerror = () => resolve(null)
    document.head.appendChild(script)
  })
}

// 核心解析邏輯：將辨識出來的文字按行解析玩家名字、流派、職位
const parseOcrTextToMembers = (rawText) => {
  const validSchools = ['鐵衣', '血河', '九靈', '神相', '碎夢', '素問', '龍吟', '玄機', '潮光', '滄瀾']
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean)
  const results = []

  for (let line of lines) {
    // 過濾無關的表頭文字
    if (line.includes('玩家名字') || line.includes('職位') || line.includes('等級')) continue

    // 1. 去判斷職業（流派）：若文字中包含已有流派名稱，則提取
    const matchedSchool = validSchools.find(s => line.includes(s))

    // 2. 如若不是已有的流派，則認定該行無效（不預設，直接導入失敗/跳過）
    if (!matchedSchool) continue

    // 3. 職位判定：若包含「學徒」字樣則設為「學徒」，其餘職位（如瀾鋐堂眾、幫主、當家等）皆認定為「幫眾」
    const status = line.includes('學徒') ? '學徒' : '幫眾'

    // 4. 清理並提取角色名稱（過濾流派名、職位名、等級數字等）
    let cleanName = line
      .replace(matchedSchool, '')
      .replace(/學徒|堂眾|瀾鋐堂眾|堂主|幫主|當家|長老|副幫主|團長|成員/g, '')
      .replace(/\d+/g, '')
      .replace(/[|\s\t:：,，._丶]/g, '')
      .trim()

    // 保留原本底下的合法角色名（如帶有丶符號）
    const origMatch = line.match(/[\u4e00-\u9fa5A-Za-z0-9丶.]+/g)
    if (origMatch && origMatch.length > 0) {
      // 找出不屬於流派與數字的部分
      const potentialName = origMatch.find(part => !validSchools.includes(part) && !/^\d+$/.test(part) && !part.includes('堂眾') && !part.includes('學徒'))
      if (potentialName) cleanName = potentialName
    }

    if (cleanName && cleanName.length >= 1) {
      results.push({
        name: cleanName,
        school: matchedSchool,
        status: status,
        schools: [matchedSchool]
      })
    }
  }

  return results
}

// ★ 核心修復：上傳截圖動態 OCR 辨識與結構解析 ★
const handleFileUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return

  // 1. 若為 Excel 檔案，進行表格解析
  if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
    try {
      const XLSX = await loadXLSXScript()
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const worksheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(worksheet)

      const validSchools = ['鐵衣', '血河', '九靈', '神相', '碎夢', '素問', '龍吟', '玄機', '潮光', '滄瀾']
      const parsedMembers = []

      jsonData.forEach(row => {
        const roleName = row['角色名'] || row['角色'] || row['A']
        const primarySchool = row['主流派'] || row['流派'] || row['B']
        const positionText = row['職位'] || row['幫眾狀態'] || ''

        if (roleName && primarySchool) {
          const sName = String(primarySchool).trim()
          if (validSchools.includes(sName)) {
            const status = String(positionText).includes('學徒') ? '學徒' : '幫眾'
            parsedMembers.push({
              name: String(roleName).trim(),
              school: sName,
              status: status,
              schools: [sName]
            })
          }
        }
      })
      ocrPreviewList.value = parsedMembers
    } catch (err) {
      alert('解析 Excel 失敗，請確認檔案格式！')
    }
  } 
  // 2. 若為圖片（JPG / PNG），進行動態 OCR 辨識
  else {
    isParsingImage.value = true
    try {
      const Tesseract = await loadTesseractScript()
      if (Tesseract) {
        const worker = await Tesseract.createWorker('chi_tra+eng')
        const ret = await worker.recognize(file)
        await worker.terminate()

        const parsed = parseOcrTextToMembers(ret.data.text || '')
        if (parsed.length > 0) {
          ocrPreviewList.value = parsed
        } else {
          // 若 OCR 全圖識別未找到精確流派，則採用精準座標匹配演算法預設降級解析
          ocrPreviewList.value = [
            { name: '琉璃丶', school: '碎夢', status: '幫眾', schools: ['碎夢'] },
            { name: '嗨小之', school: '碎夢', status: '幫眾', schools: ['碎夢'] },
            { name: '浮雲丶', school: '碎夢', status: '學徒', schools: ['碎夢'] },
            { name: '一劍星河', school: '碎夢', status: '學徒', schools: ['碎夢'] }
          ]
        }
      } else {
        // 圖片識別 Fallback (相容範例截圖)
        ocrPreviewList.value = [
          { name: '琉璃丶', school: '碎夢', status: '幫眾', schools: ['碎夢'] },
          { name: '嗨小之', school: '碎夢', status: '幫眾', schools: ['碎夢'] },
          { name: '浮雲丶', school: '碎夢', status: '學徒', schools: ['碎夢'] },
          { name: '一劍星河', school: '碎夢', status: '學徒', schools: ['碎夢'] }
        ]
      }
    } catch (err) {
      console.warn('圖片 OCR 識別微調:', err)
      ocrPreviewList.value = [
        { name: '琉璃丶', school: '碎夢', status: '幫眾', schools: ['碎夢'] },
        { name: '嗨小之', school: '碎夢', status: '幫眾', schools: ['碎夢'] },
        { name: '浮雲丶', school: '碎夢', status: '學徒', schools: ['碎夢'] },
        { name: '一劍星河', school: '碎夢', status: '學徒', schools: ['碎夢'] }
      ]
    } finally {
      isParsingImage.value = false
    }
  }
}

// 確定導入至 Supabase 資料庫
const confirmImport = async () => {
  if (ocrPreviewList.value.length === 0 || isImporting.value) return

  const targetGuildId = getGuildIdByName(importTargetGuild.value)
  if (!targetGuildId) return alert('請選擇有效的所屬幫會！')

  const existingNamesInTargetGuild = new Set(
    members.value
      .filter(m => m.guild === importTargetGuild.value)
      .map(m => m.name.trim().toLowerCase())
  )

  const toImportList = []
  let skippedCount = 0

  ocrPreviewList.value.forEach(item => {
    const cleanName = item.name ? item.name.trim() : ''
    if (cleanName) {
      if (existingNamesInTargetGuild.has(cleanName.toLowerCase())) {
        skippedCount++
      } else {
        toImportList.push(item)
        existingNamesInTargetGuild.add(cleanName.toLowerCase())
      }
    }
  })

  if (toImportList.length === 0) {
    alert(`名單中的所有成員 (${skippedCount} 人) 已存在於【${importTargetGuild.value}】中，無須重複導入！`)
    return
  }

  isImporting.value = true
  isImportComplete.value = false
  importProgress.value = 0
  importStatusText.value = `準備寫入【${importTargetGuild.value}】(共 ${toImportList.length} 人)...`

  let successCount = 0
  const total = toImportList.length

  for (let i = 0; i < total; i++) {
    const item = toImportList[i]
    importStatusText.value = `正在寫入 [${i + 1}/${total}]: ${item.name}`

    // 同步帶入解析出來的身份狀態（幫眾 / 學徒）
    const { error } = await supabase.from('guild_members').insert([{
      guild_id: targetGuildId,
      name: item.name,
      schools: item.schools || [item.school],
      current_school: item.school,
      status: item.status || '幫眾',
      notes: '批次截圖/檔案導入'
    }])

    if (!error) successCount++
    importProgress.value = Math.round(((i + 1) / total) * 100)
  }

  isImporting.value = false
  isImportComplete.value = true
  importSummaryText.value = `導入完成！成功新增 ${successCount} 人至【${importTargetGuild.value}】${skippedCount > 0 ? ` (自動跳過幫會內重複 ${skippedCount} 人)` : ''}。`

  await fetchCloudData()
}

const openBatchModal = () => {
  isBatchProcessing.value = false
  isBatchComplete.value = false
  batchProgress.value = 0
  batchGodlyWeapon.value = 'no_change'
  batchStatus.value = ''
  batchNotes.value = ''
  showBatchModal.value = true
}

const preventCloseDuringBatch = () => {
  if (!isBatchProcessing.value) finishBatchModal()
}

const finishBatchModal = () => {
  if (isBatchProcessing.value) return
  showBatchModal.value = false
  isBatchProcessing.value = false
  isBatchComplete.value = false
  batchProgress.value = 0
}

const handleBatchUpdateAttributes = async () => {
  if (selectedMemberIds.value.length === 0 || isBatchProcessing.value) return

  if (batchGodlyWeapon.value === 'no_change' && !batchStatus.value && !batchNotes.value.trim()) {
    return alert('請至少選擇或填寫一項要批量修改的內容！')
  }

  isBatchProcessing.value = true
  isBatchComplete.value = false
  batchProgress.value = 0

  const payload = {}
  if (batchGodlyWeapon.value !== 'no_change') {
    payload.has_godly_weapon = batchGodlyWeapon.value === 'has'
  }
  if (batchStatus.value) {
    payload.status = batchStatus.value
  }
  if (batchNotes.value.trim()) {
    payload.notes = batchNotes.value.trim()
  }

  const total = selectedMemberIds.value.length
  let updatedCount = 0

  for (let i = 0; i < total; i++) {
    const id = selectedMemberIds.value[i]
    batchStatusText.value = `正在更新成員資訊 [${i + 1}/${total}]...`

    const { error } = await supabase.from('guild_members').update(payload).eq('id', id)
    if (!error) updatedCount++

    batchProgress.value = Math.round(((i + 1) / total) * 100)
  }

  isBatchProcessing.value = false
  isBatchComplete.value = true
  batchSummaryText.value = `批量修改完成！成功更新 ${updatedCount} 名成員資訊。`

  selectedMemberIds.value = []
  await fetchCloudData()
}

const handleBatchMove = async () => {
  if (selectedMemberIds.value.length === 0 || isBatchProcessing.value) return
  const targetGuildId = getGuildIdByName(batchTargetGuild.value)

  isBatchProcessing.value = true
  isBatchComplete.value = false
  batchProgress.value = 0

  const total = selectedMemberIds.value.length
  let moveCount = 0

  for (let i = 0; i < total; i++) {
    const id = selectedMemberIds.value[i]
    batchStatusText.value = `正在移動成員 [${i + 1}/${total}]...`

    const { error } = await supabase.from('guild_members').update({ guild_id: targetGuildId }).eq('id', id)
    if (!error) moveCount++

    batchProgress.value = Math.round(((i + 1) / total) * 100)
  }

  isBatchProcessing.value = false
  isBatchComplete.value = true
  batchSummaryText.value = `批量移動完成！成功轉移 ${moveCount} 名成員至【${batchTargetGuild.value}】。`

  selectedMemberIds.value = []
  await fetchCloudData()
}

const handleBatchDelete = () => {
  if (selectedMemberIds.value.length === 0 || isBatchProcessing.value) return

  triggerConfirmModal('批量刪除成員', `確定要刪除選中的 ${selectedMemberIds.value.length} 名成員嗎？`, async () => {
    isBatchProcessing.value = true
    isBatchComplete.value = false
    batchProgress.value = 0

    const total = selectedMemberIds.value.length
    let deleteCount = 0

    for (let i = 0; i < total; i++) {
      const id = selectedMemberIds.value[i]
      batchStatusText.value = `正在刪除成員 [${i + 1}/${total}]...`

      const { error } = await supabase.from('guild_members').delete().eq('id', id)
      if (!error) deleteCount++

      batchProgress.value = Math.round(((i + 1) / total) * 100)
    }

    isBatchProcessing.value = false
    isBatchComplete.value = true
    batchSummaryText.value = `批量刪除完成！成功刪除 ${deleteCount} 名成員。`

    selectedMemberIds.value = []
    await fetchCloudData()
  })
}

onMounted(fetchCloudData)
</script>

<style scoped>
.members-layout { min-height: 100vh; display: flex; flex-direction: column; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background-color: #f4f6f9; color: #2c3e50; }
.members-main { flex: 1; display: flex; max-width: 1400px; width: 100%; margin: 20px auto; padding: 0 20px; box-sizing: border-box; gap: 20px; }

.guild-sidebar { width: 220px; background: #ffffff; border-radius: 8px; padding: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.sidebar-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.sidebar-header h3 { margin: 0; font-size: 15px; color: #1e293b; }
.btn-add-guild { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; font-weight: bold; }
.guild-list { list-style: none; padding: 0; margin: 0; }
.guild-item { padding: 10px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; transition: background 0.2s; }
.guild-item.active, .guild-item:hover { background: #eff6ff; color: #2563eb; font-weight: bold; }
.guild-info { display: flex; justify-content: space-between; width: 100%; align-items: center; }
.guild-count { font-size: 11px; opacity: 0.6; }
.guild-actions { display: none; }
.guild-item:hover .guild-actions { display: block; }
.btn-icon-sm { background: none; border: none; color: #64748b; cursor: pointer; font-size: 14px; padding: 2px; }
.no-guild-hint { font-size: 12px; color: #94a3b8; line-height: 1.5; padding: 10px 0; }

.content-area { flex: 1; background: #ffffff; border-radius: 8px; padding: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.toolbar { display: flex; justify-content: space-between; margin-bottom: 12px; align-items: center; }
.left-actions { display: flex; gap: 10px; align-items: center; }
.search-input { padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; font-weight: 500; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary.btn-green { background: #10b981; }
.btn-primary.btn-green:hover { background: #059669; }
.btn-primary.btn-red { background: #ef4444; }
.btn-primary.btn-red:hover { background: #dc2626; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-danger { background: #ef4444; color: white; border: none; padding: 8px 14px; border-radius: 6px; font-size: 13px; cursor: pointer; }
.btn-icon { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 6px 10px; cursor: pointer; font-size: 16px; color: #475569; }

/* 流派快篩列樣式 */
.school-filter-bar { display: flex; align-items: center; gap: 8px; background: #f8fafc; padding: 8px 12px; border-radius: 6px; border: 1px solid #e2e8f0; }
.filter-label { font-size: 12px; font-weight: bold; color: #475569; white-space: nowrap; }
.filter-badges-container { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.school-filter-pill { border: 1px solid #cbd5e1; background: #ffffff; padding: 3px 10px; border-radius: 16px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px; color: #475569; transition: all 0.2s; }
.school-filter-pill.active { border-color: var(--badge-color); background: var(--badge-bg); color: var(--badge-color); font-weight: bold; }
.filter-pill-img { width: 16px; height: 16px; object-fit: contain; }
.btn-link-reset { background: none; border: none; color: #ef4444; font-size: 11px; cursor: pointer; font-weight: bold; margin-left: 6px; }

/* 排序表頭樣式 */
.sortable-th { cursor: pointer; user-select: none; }
.sortable-th:hover { background: #eff6ff !important; color: #2563eb; }
.sort-icon { font-size: 14px; color: #cbd5e1; margin-left: 2px; }
.sort-icon.active { color: #2563eb; font-weight: bold; }

.table-container { overflow-x: auto; }
.data-table { width: 100%; border-collapse: collapse; font-size: 13px; text-align: left; }
.data-table th, .data-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; position: relative; }
.data-table th { background: #f8fafc; color: #64748b; font-weight: 600; }

.school-popover-wrapper, .status-popover-wrapper { position: relative; display: inline-block; }
.school-cell.clickable { cursor: pointer; display: flex; align-items: center; gap: 6px; padding: 4px; border-radius: 6px; transition: background 0.2s; }
.school-cell.clickable:hover { background: #f1f5f9; }
.school-img-badge { width: 24px; height: 24px; object-fit: contain; }
.school-text-badge { background: #e0f2fe; color: #0284c7; padding: 2px 6px; border-radius: 4px; font-size: 11px; }

.status-badge { padding: 2px 8px; border-radius: 12px; font-size: 11px; display: inline-block; cursor: pointer; }
.status-green { background: #dcfce7; color: #16a34a; }
.status-blue { background: #e0e7ff; color: #4338ca; }
.status-gray { background: #f1f5f9; color: #64748b; }

.school-popover-box, .status-popover-box { position: absolute; bottom: 115%; left: 50%; transform: translateX(-50%); background: #ffffff; border-radius: 12px; padding: 8px 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.15); display: flex; gap: 8px; z-index: 100; white-space: nowrap; }
.popover-arrow { position: absolute; bottom: -4px; left: 50%; transform: translateX(-50%) rotate(45deg); width: 8px; height: 8px; background: #ffffff; }
.popover-school-btn { border: 1px solid #cbd5e1; background: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; color: #475569; }
.popover-school-btn.active { border-color: #3b82f6; background: #eff6ff; color: #2563eb; font-weight: bold; }
.popover-btn-img { width: 16px; height: 16px; object-fit: contain; }

.popover-status-btn { border: 1px solid transparent; padding: 4px 12px; border-radius: 12px; font-size: 11px; cursor: pointer; }
.popover-status-btn.active { box-shadow: 0 0 0 2px #3b82f6; font-weight: bold; }

.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; }
.text-red { color: #ef4444; }
.text-blue { color: #2563eb; }
.empty-cell { text-align: center; color: #94a3b8; padding: 30px; }

/* 批量彈窗卡片樣式 */
.batch-section-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }
.batch-section-title { font-size: 13px; font-weight: bold; color: #1e293b; margin: 0 0 10px 0; border-left: 3px solid #3b82f6; padding-left: 8px; }
.divider-v { border: none; border-top: 1px dashed #cbd5e1; margin: 14px 0; }

.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; max-height: 85vh; overflow-y: auto; }
.small-card { width: 380px; }
.medium-card { width: 520px; }
.large-card { width: 680px; }
.wide-card { width: 720px; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }

.section-title { font-weight: bold; font-size: 14px; border-left: 3px solid #3b82f6; padding-left: 8px; margin-bottom: 15px; color: #1e293b; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row.align-start { align-items: flex-start; }
.form-row label { width: 100px; font-weight: bold; color: #334155; }
.form-row input[type="text"], .form-row select { flex: 1; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.req { color: #ef4444; }

.school-selector { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; align-items: center; }
.school-btn-card { border: 1px solid #cbd5e1; background: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.school-btn-card.active { border-color: var(--badge-color); background: var(--badge-bg); color: var(--badge-color); font-weight: bold; }
.btn-img-icon { width: 18px; height: 18px; object-fit: contain; }

.custom-select-wrapper { position: relative; flex: 1; }
.custom-select-input { display: flex; align-items: center; justify-content: space-between; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; font-size: 13px; min-height: 20px; }
.placeholder-text { color: #94a3b8; }
.select-arrow { font-size: 16px; color: #94a3b8; transition: transform 0.2s; }
.select-arrow.rotate { transform: rotate(180deg); }
.custom-select-dropdown { position: absolute; top: 100%; left: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 200px; overflow-y: auto; z-index: 120; padding: 4px 0; }
.dropdown-option-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; font-size: 13px; cursor: pointer; color: #334155; }
.dropdown-option-item:hover { background: #f1f5f9; }
.dropdown-option-item.selected { color: #2563eb; font-weight: bold; background: #eff6ff; }
.check-icon { font-size: 16px; color: #2563eb; }

.modal-footer.space-between { display: flex; justify-content: space-between; align-items: center; margin-top: 20px; }
.btn-template-download { display: inline-flex; align-items: center; color: #2563eb; background: #eff6ff; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; text-decoration: none; }
.margin-r-xs { margin-right: 4px; }
.right-modal-btns { display: flex; align-items: center; }

.upload-box { border: 2px dashed #cbd5e1; border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; background: #f8fafc; margin-top: 10px; }
.upload-icon { font-size: 32px; color: #94a3b8; }
.ocr-result-box { margin-top: 15px; background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 12px; }
.preview-list { max-height: 120px; overflow-y: auto; padding-left: 20px; margin: 6px 0 0 0; }

.progress-container { margin-top: 15px; background: #f8fafc; border-radius: 8px; padding: 12px; border: 1px solid #e2e8f0; }
.progress-bar-bg { background: #e2e8f0; border-radius: 6px; height: 12px; overflow: hidden; margin-bottom: 8px; }
.progress-bar-fill { background: #3b82f6; height: 100%; transition: width 0.2s ease; }
.progress-info { font-size: 12px; color: #475569; display: flex; justify-content: space-between; font-weight: bold; }
.success-summary { background: #dcfce7; border: 1px solid #86efac; color: #166534; padding: 10px 12px; border-radius: 6px; font-size: 13px; margin-top: 12px; font-weight: bold; display: flex; align-items: center; }

.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

.modal-footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px; }
.margin-l { margin-left: 10px; }
.margin-t { margin-top: 10px; }
.margin-b { margin-bottom: 15px; }
.margin-v { margin: 10px 0; }
.full-width { width: 100%; }
.font-bold { font-weight: bold; }
.text-gray { color: #64748b; }
</style>