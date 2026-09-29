<template>
  <div class="roster-board-layout" @click="closeAllSkillDropdowns">
    <!-- 頂部 Header -->
    <div class="roster-header-bar">
      <div class="header-left-info">
        <button class="btn-back-link" @click="$emit('back')">&lt; 返回聯賽列表</button>
        <span class="league-title-tag">{{ leagueInfo.title }}</span>
        <span class="league-type-tag">{{ leagueInfo.type }}</span>
        <span class="league-time-text">{{ leagueInfo.startTime }}</span>
      </div>

      <div class="header-right-actions">
        <!-- 點擊觸發導出預覽 Modal -->
        <button class="btn-export" @click="openExportPreviewModal">導出圖片 <i class="mdi mdi-chevron-down"></i></button>
      </div>
    </div>

    <div class="roster-main-container">
      
      <!-- 1. 左側待選成員組件 -->
      <RosterSidebar 
        :guildName="leagueInfo.guild"
        :allMembers="allMembers"
        :availableSchools="availableSchools"
        :showSecondarySchool="showSecondarySchool"
        @open-add-member="openAddMemberModal"
        @open-edit-member="openFullMemberEditModal"
        @drag-start-member="onDragStartPendingMember"
      />

      <!-- 右側內容區 -->
      <main class="matrix-content-area">
        <!-- 團隊工具列 -->
        <div class="matrix-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-section-title">團隊配置</span>
            <button class="btn-secondary-sm margin-l" :disabled="isSaving" @click="saveRosterBoard">
              {{ isSaving ? '保存中...' : '保存陣容' }}
            </button>
            <button v-if="matrixTeams.length < 5" class="btn-primary-sm margin-l" @click="addTeam">+ 添加團隊</button>
            <button class="btn-secondary-sm margin-l" @click="openBatchEditModal">批量編輯</button>

            <!-- 顯示副職開關 -->
            <div class="inline-switch-group margin-l">
              <span class="switch-label-text">顯示副職</span>
              <label class="switch-sm">
                <input type="checkbox" v-model="showSecondarySchool" />
                <span class="slider-sm"></span>
              </label>
            </div>

            <!-- 顯示詳情開關 -->
            <div class="inline-switch-group margin-l">
              <span class="switch-label-text">顯示詳情</span>
              <label class="switch-sm">
                <input type="checkbox" v-model="showDetails" />
                <span class="slider-sm"></span>
              </label>
            </div>

            <button class="btn-link text-red margin-l font-bold" @click="confirmClearRoster">清空陣容</button>
          </div>

          <div class="toolbar-right">
            <span class="template-select-label">團隊排表</span>
            <div class="custom-select-wrapper" @click.stop>
              <div class="custom-select-input" @click="showTemplateDropdown = !showTemplateDropdown">
                <span>{{ appliedTemplateName || '選擇陣容模板' }}</span>
                <i class="mdi mdi-chevron-down select-arrow"></i>
              </div>
              <div v-if="showTemplateDropdown" class="custom-select-dropdown">
                <div 
                  v-for="tpl in templateOptions" 
                  :key="tpl.id" 
                  class="dropdown-item"
                  @click="applyRosterTemplate(tpl)"
                >
                  {{ tpl.name }}
                </div>
              </div>
            </div>

            <!-- 版型切換按鈕組 -->
            <div class="layout-switch-btn-group margin-l">
              <button 
                :class="['layout-icon-btn', { active: layoutMode === 'matrix' }]" 
                @click="layoutMode = 'matrix'" 
                title="矩陣卡片視圖"
              >
                <i class="mdi mdi-view-grid-outline"></i>
              </button>
              <button 
                :class="['layout-icon-btn', { active: layoutMode === 'table' }]" 
                @click="layoutMode = 'table'" 
                title="試算表視圖"
              >
                <i class="mdi mdi-table"></i>
              </button>
            </div>
          </div>
        </div>

        <!-- 上陣職業數量統計欄 -->
        <div class="onboard-stats-bar">
          <span class="stats-bar-title">上陣職業統計：</span>
          <div class="stats-icons-list">
            <div v-for="s in availableSchools" :key="s.name" class="stats-icon-item">
              <img :src="getSchoolImg(s.file)" class="stats-school-img" :title="s.name" />
              <span 
                :class="['stats-count-badge', { active: schoolAssignedCounts[s.name] > 0 }]"
              >
                {{ schoolAssignedCounts[s.name] || 0 }}
              </span>
            </div>
          </div>
        </div>

        <!-- 2. 右側矩陣視圖 -->
        <RosterMatrixView 
          v-if="layoutMode === 'matrix'"
          :matrixTeams="matrixTeams"
          :availableSchools="availableSchools"
          :schoolColorMap="schoolColorMap"
          :showSecondarySchool="showSecondarySchool"
          :showDetails="showDetails"
          @open-edit-team="openEditTeamModal"
          @add-squad="addSquadToTeam"
          @drag-start-squad="onDragStartSquad"
          @drop-squad-column="onDropOnSquadColumn"
          @drag-start-slot="onDragStartSlot"
          @drop-slot="onDropOnSlot"
          @click-slot="handleSlotClick"
          @remove-member-slot="removeMemberFromSlot"
        />

        <!-- 3. 右側試算表視圖 -->
        <RosterTableView 
          v-else-if="layoutMode === 'table'"
          :leagueInfo="leagueInfo"
          :matrixTeams="matrixTeams"
          :availableSchools="availableSchools"
          :schoolColorMap="schoolColorMap"
          @click-slot="handleSlotClick"
          @drag-start-slot="onDragStartSlot"
          @drop-slot="onDropOnSlot"
          @open-edit-team="openEditTeamModal"
        />

      </main>
    </div>

    <!-- ================= Modals 集中管理 ================= -->

    <!-- 導出圖片預覽 Modal -->
    <div v-if="showExportModal" class="modal-overlay full-screen-overlay" @click.self="showExportModal = false">
      <div class="export-modal-container">
        <div class="export-modal-topbar">
          <button class="btn-back-link" @click="showExportModal = false">&lt; 返回排表</button>
          <span class="export-modal-title">導出圖片預覽</span>
          <span class="close-btn" @click="showExportModal = false">&times;</span>
        </div>

        <div class="export-modal-body">
          <div class="export-sidebar-controls simple-sidebar">
            <div class="sidebar-info-card margin-b">
              <h4 class="sidebar-card-title">圖片導出說明</h4>
              <p class="sidebar-card-desc">預覽畫面即為最終導出之 PNG 高畫質圖片，畫面純淨不含水印與網址。</p>
            </div>

            <div class="export-control-section margin-b">
              <div class="export-section-title">表頭</div>
              <div class="control-switch-item">
                <span>顯示名稱</span>
                <label class="switch-sm">
                  <input type="checkbox" v-model="exportHeaderTitleVisible" />
                  <span class="slider-sm"></span>
                </label>
              </div>
              <div class="control-switch-item">
                <span>顯示備註</span>
                <label class="switch-sm">
                  <input type="checkbox" v-model="exportHeaderNoteVisible" />
                  <span class="slider-sm"></span>
                </label>
              </div>
            </div>

            <div class="export-control-section margin-b">
              <div class="export-section-title">隊伍 (導入團隊)</div>
              <div v-for="team in matrixTeams" :key="team.id" class="control-switch-item">
                <span class="team-switch-label">
                  <span v-if="team.color" class="team-color-dot-sm" :style="{ backgroundColor: team.color }"></span>
                  {{ team.name }}
                </span>
                <label class="switch-sm">
                  <input type="checkbox" :value="team.id" v-model="exportVisibleTeamIds" />
                  <span class="slider-sm"></span>
                </label>
              </div>
            </div>

            <div class="export-actions-bottom margin-t">
              <button class="btn-primary full-w btn-lg" :disabled="isExporting" @click="downloadExportImage">
                <i class="mdi mdi-download margin-r"></i> {{ isExporting ? '正在生成圖片...' : '導出 PNG 圖片' }}
              </button>
              <button class="btn-secondary full-w margin-t" @click="showExportModal = false">取消</button>
            </div>
          </div>

          <div class="export-preview-stage">
            <div class="preview-canvas-paper">
              <RosterMatrixView 
                v-if="layoutMode === 'matrix'"
                :matrixTeams="exportFilteredTeams"
                :availableSchools="availableSchools"
                :schoolColorMap="schoolColorMap"
                :showSecondarySchool="showSecondarySchool"
                :showDetails="showDetails"
              />
              <RosterTableView 
                v-else-if="layoutMode === 'table'"
                :leagueInfo="leagueInfo"
                :matrixTeams="exportFilteredTeams"
                :availableSchools="availableSchools"
                :schoolColorMap="schoolColorMap"
                :showHeaderTitle="exportHeaderTitleVisible"
                :showHeaderNote="exportHeaderNoteVisible"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 交換兩隊位置 Modal -->
    <div v-if="showSwapSquadModal" class="modal-overlay" @click.self="showSwapSquadModal = false">
      <div class="modal-card confirm-modal-card wide-swap-card">
        <div class="modal-header">
          <h3>交換兩隊位置</h3>
          <span class="close-btn" @click="showSwapSquadModal = false">&times;</span>
        </div>
        <div class="modal-body text-left">
          <p class="sub-hint-text margin-b">將交換兩隊全部成員。還可勾選是否一併交換：</p>
          <div class="swap-checkbox-list">
            <label class="checkbox-label"><input type="checkbox" v-model="swapOptions.name" /> <span>交換隊伍名稱</span></label>
            <label class="checkbox-label"><input type="checkbox" v-model="swapOptions.zhineng" /> <span>交換小隊職能</span></label>
            <label class="checkbox-label"><input type="checkbox" v-model="swapOptions.desc" /> <span>交換小隊備註</span></label>
            <label class="checkbox-label"><input type="checkbox" v-model="swapOptions.template" /> <span>交換排表模板</span></label>
          </div>
        </div>
        <div class="confirm-modal-footer space-between">
          <button class="btn-primary" @click="executeSwapSquad">確定套用</button>
          <button class="btn-secondary" @click="showSwapSquadModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 批量編輯 Modal -->
    <div v-if="showBatchEditModal" class="modal-overlay" @click.self="showBatchEditModal = false">
      <div class="modal-card wide-card batch-modal-card">
        <div class="modal-header">
          <h3>批量編輯成員職能與配裝</h3>
          <span class="close-btn" @click="showBatchEditModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <div class="batch-toolbar-top">
            <span>已選 {{ selectedBatchMembers.length }} 人</span>
            <button class="btn-secondary-sm margin-l" @click="selectedBatchMembers = []">清空選擇</button>

            <button class="btn-primary-sm margin-l" @click="openBatchRoleSelectModal">配置職能</button>
            <button class="btn-primary-sm margin-l" @click="openBatchJuejiSelectModal">配置絕技</button>
            <button class="btn-primary-sm margin-l" @click="openBatchQunxiaSelectModal">配置群俠百家</button>
            <button class="btn-primary-sm margin-l" @click="openBatchLiupaiSelectModal">配置流派技能</button>
          </div>

          <div class="batch-table-container margin-t">
            <div v-for="group in batchMemberGroups" :key="group.title" class="batch-group-block">
              <div class="batch-group-title">
                <input type="checkbox" @change="toggleGroupBatchSelect(group, $event)" />
                <span class="margin-l">{{ group.title }}</span>
              </div>
              <table class="batch-table">
                <thead>
                  <tr>
                    <th width="40"></th>
                    <th width="90">成員</th>
                    <th width="70">流派</th>
                    <th width="180">職能</th>
                    <th width="130">絕技</th>
                    <th>群俠百家</th>
                    <th>流派技能</th>
                  </tr>
                </thead>
                <tbody>
                  <tr 
                    v-for="m in group.members" 
                    :key="m.slotId"
                    :style="getRowSchoolBgStyle(m.school)"
                  >
                    <td><input type="checkbox" :value="m.slotId" v-model="selectedBatchMembers" /></td>
                    <td class="font-bold">{{ m.name }}</td>
                    <td>{{ m.school }}</td>
                    
                    <td>
                      <div class="custom-dropdown-container">
                        <div 
                          class="batch-roles-display clickable-select"
                          @click.stop="toggleBatchRowDropdown('role_' + m.slotId)"
                        >
                          <span class="text-truncate">{{ Array.isArray(m.rolesList) && m.rolesList.length > 0 ? m.rolesList.join('、') : '選擇職能' }}</span>
                          <i class="mdi mdi-chevron-down select-arrow"></i>
                        </div>
                        <div v-if="activeBatchDropdown === ('role_' + m.slotId)" class="skill-dropdown-panel" @click.stop>
                          <div 
                            v-for="r in personalRoleOptions" 
                            :key="r" 
                            :class="['dropdown-item', { selected: isBatchRowRoleSelected(m, r) }]"
                            @click.stop="toggleBatchRowRole(m, r)"
                          >
                            <span>{{ r }}</span>
                            <i v-if="isBatchRowRoleSelected(m, r)" class="mdi mdi-check check-icon"></i>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="custom-dropdown-container">
                        <input type="text" v-model="m.jueji" placeholder="輸入或選擇絕技" class="table-inline-input" @click.stop />
                        <button type="button" class="dropdown-toggle-btn" @click.stop="toggleBatchRowDropdown('jueji_' + m.slotId)">
                          <i :class="['mdi', 'mdi-chevron-down', { rotate: activeBatchDropdown === ('jueji_' + m.slotId) }]"></i>
                        </button>
                        <div v-if="activeBatchDropdown === ('jueji_' + m.slotId)" class="skill-dropdown-panel" @click.stop>
                          <div v-for="j in juejiOptions" :key="j" class="dropdown-item" @click.stop="m.jueji = j; activeBatchDropdown = null">
                            {{ j }}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="custom-dropdown-container">
                        <input type="text" v-model="m.qunxia" placeholder="輸入或選擇群俠百家" class="table-inline-input" @click.stop />
                        <button type="button" class="dropdown-toggle-btn" @click.stop="toggleBatchRowDropdown('qunxia_' + m.slotId)">
                          <i :class="['mdi', 'mdi-chevron-down', { rotate: activeBatchDropdown === ('qunxia_' + m.slotId) }]"></i>
                        </button>
                        <div v-if="activeBatchDropdown === ('qunxia_' + m.slotId)" class="skill-dropdown-panel" @click.stop>
                          <div 
                            v-for="q in qunxiaOptions" 
                            :key="q" 
                            :class="['dropdown-item', { selected: isBatchRowQunxiaSelected(m, q) }]"
                            @click.stop="toggleBatchRowQunxia(m, q)"
                          >
                            <span>{{ q }}</span>
                            <i v-if="isBatchRowQunxiaSelected(m, q)" class="mdi mdi-check check-icon"></i>
                          </div>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div class="custom-dropdown-container">
                        <input type="text" v-model="m.zhuangbei" placeholder="輸入或選擇流派技能" class="table-inline-input" @click.stop />
                        <button type="button" class="dropdown-toggle-btn" @click.stop="toggleBatchRowDropdown('liupai_' + m.slotId)">
                          <i :class="['mdi', 'mdi-chevron-down', { rotate: activeBatchDropdown === ('liupai_' + m.slotId) }]"></i>
                        </button>
                        <div v-if="activeBatchDropdown === ('liupai_' + m.slotId)" class="skill-dropdown-panel" @click.stop>
                          <div 
                            v-for="l in liupaiSkillOptions" 
                            :key="l" 
                            :class="['dropdown-item', { selected: isBatchRowLiupaiSelected(m, l) }]"
                            @click.stop="toggleBatchRowLiupai(m, l)"
                          >
                            <span>{{ l }}</span>
                            <i v-if="isBatchRowLiupaiSelected(m, l)" class="mdi mdi-check check-icon"></i>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer space-between">
          <button class="btn-primary" @click="saveBatchEdit">保存</button>
          <button class="btn-secondary" @click="showBatchEditModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 批量【職能】Modal -->
    <div v-if="showBatchRoleDialog" class="modal-overlay" @click.self="showBatchRoleDialog = false">
      <div class="modal-card small-card wide-dialog">
        <div class="modal-header">
          <h3>批量配置職能</h3>
          <span class="close-btn" @click="showBatchRoleDialog = false">&times;</span>
        </div>
        <div class="modal-body">
          <p class="sub-hint-text margin-b">將為選中的 {{ selectedBatchMembers.length }} 名成員統一設定職能 (可多選)：</p>
          <div class="role-pills-grid">
            <button 
              v-for="r in personalRoleOptions" 
              :key="r"
              :class="['role-pill-btn', { active: tempBatchRolePills.includes(r) }]"
              @click="toggleTempBatchRolePill(r)"
            >
              {{ r }}
            </button>
          </div>
        </div>
        <div class="modal-footer space-between gap-large margin-t">
          <button class="btn-primary" @click="applyBatchRoleSelection">確定套用</button>
          <button class="btn-secondary" @click="showBatchRoleDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 批量【絕技】Modal -->
    <div v-if="showBatchJuejiDialog" class="modal-overlay" @click.self="showBatchJuejiDialog = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>批量配置絕技</h3>
          <span class="close-btn" @click="showBatchJuejiDialog = false">&times;</span>
        </div>
        <div class="modal-body">
          <p class="sub-hint-text margin-b">選取的絕技 (單選)：</p>
          <select v-model="tempBatchJuejiVal" class="select-field flex-1 full-w">
            <option value="">清空 / 不設置</option>
            <option v-for="j in juejiOptions" :key="j" :value="j">{{ j }}</option>
          </select>
        </div>
        <div class="modal-footer space-between gap-large margin-t">
          <button class="btn-primary" @click="applyBatchJuejiSelection">確定套用</button>
          <button class="btn-secondary" @click="showBatchJuejiDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 批量【群俠百家】Modal -->
    <div v-if="showBatchQunxiaDialog" class="modal-overlay" @click.self="showBatchQunxiaDialog = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>批量配置群俠百家</h3>
          <span class="close-btn" @click="showBatchQunxiaDialog = false">&times;</span>
        </div>
        <div class="modal-body">
          <p class="sub-hint-text margin-b">選擇或手動輸入群俠百家 (可複選)：</p>
          <div class="role-pills-grid margin-b">
            <button 
              v-for="q in qunxiaOptions" 
              :key="q"
              :class="['role-pill-btn', { active: isBatchQunxiaPillSelected(q) }]"
              @click="toggleBatchQunxiaPill(q)"
            >
              {{ q }}
            </button>
          </div>
          <input type="text" v-model="tempBatchQunxiaVal" placeholder="輸入或選擇，最長20字" class="input-field full-w" />
        </div>
        <div class="modal-footer space-between gap-large margin-t">
          <button class="btn-primary" @click="applyBatchQunxiaSelection">確定套用</button>
          <button class="btn-secondary" @click="showBatchQunxiaDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 批量【流派技能】Modal -->
    <div v-if="showBatchLiupaiDialog" class="modal-overlay" @click.self="showBatchLiupaiDialog = false">
      <div class="modal-card small-card">
        <div class="modal-header">
          <h3>批量配置流派技能</h3>
          <span class="close-btn" @click="showBatchLiupaiDialog = false">&times;</span>
        </div>
        <div class="modal-body">
          <p class="sub-hint-text margin-b">選擇或手動輸入流派技能 (可複選)：</p>
          <div class="role-pills-grid margin-b">
            <button 
              v-for="l in liupaiSkillOptions" 
              :key="l"
              :class="['role-pill-btn', { active: isBatchLiupaiPillSelected(l) }]"
              @click="toggleBatchLiupaiPill(l)"
            >
              {{ l }}
            </button>
          </div>
          <input type="text" v-model="tempBatchLiupaiVal" placeholder="輸入或選擇，最長20字" class="input-field full-w" />
        </div>
        <div class="modal-footer space-between gap-large margin-t">
          <button class="btn-primary" @click="applyBatchLiupaiSelection">確定套用</button>
          <button class="btn-secondary" @click="showBatchLiupaiDialog = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 編輯團隊 Modal -->
    <div v-if="showEditTeamModal" class="modal-overlay" @click.self="showEditTeamModal = false">
      <div class="modal-card wide-card">
        <div class="modal-header">
          <div class="modal-title-with-sub">
            <h3>編輯團隊</h3>
            <span class="modal-sub-desc">團隊名稱、顏色、備註與小隊職能維護</span>
          </div>
          <span class="close-btn" @click="showEditTeamModal = false">&times;</span>
        </div>

        <div class="modal-body">
          <div class="team-tab-pills-row">
            <button 
              v-for="(t, idx) in matrixTeams" 
              :key="t.id"
              :class="['team-tab-pill', { active: activeEditTeamIndex === idx }]"
              @click="activeEditTeamIndex = idx"
            >
              <span v-if="t.color" class="team-color-circle-sm" :style="{ backgroundColor: t.color }"></span>
              {{ t.name }}
            </button>
          </div>

          <div v-if="currentEditingTeam" class="edit-team-content-body margin-t">
            <div class="form-row">
              <label><span class="req">*</span>團隊名稱：</label>
              <input 
                type="text" 
                v-model="currentEditingTeam.name" 
                maxlength="12" 
                placeholder="請輸入團隊名稱" 
                class="flex-1 input-field"
              />
              <button 
                class="btn-link text-red font-bold margin-l" 
                @click="deleteCurrentEditingTeam"
              >
                移除團隊
              </button>
            </div>

            <div class="form-row margin-t">
              <label>團隊顏色：</label>
              <div class="team-color-picker-flex">
                <button 
                  type="button"
                  :class="['color-clear-btn', { active: !currentEditingTeam.color }]"
                  @click="currentEditingTeam.color = ''"
                >
                  無顏色
                </button>
                <button 
                  v-for="c in teamColorOptions" 
                  :key="c.color"
                  type="button"
                  :class="['color-dot-btn', { active: currentEditingTeam.color === c.color }]"
                  :style="{ backgroundColor: c.color }"
                  :title="c.label"
                  @click="currentEditingTeam.color = c.color"
                >
                  <i v-if="currentEditingTeam.color === c.color" class="mdi mdi-check check-white"></i>
                </button>
              </div>
            </div>

            <div class="form-block margin-t">
              <div class="block-title">團隊備註</div>
              <div class="input-with-counter">
                <input 
                  type="text" 
                  v-model="currentEditingTeam.desc" 
                  maxlength="30" 
                  placeholder="選填，最多 30 字" 
                  class="counter-input"
                />
                <span class="input-char-counter">{{ (currentEditingTeam.desc || '').length }} / 30</span>
              </div>
            </div>

            <div class="form-block margin-t">
              <div class="squad-title-header">
                <div class="block-title">小隊 (最多 5 隊)</div>
                <button 
                  v-if="currentEditingTeam.squads.length < 5" 
                  class="add-squad-link-btn" 
                  @click="addSquadToTeam(currentEditingTeam)"
                >
                  + 添加小隊
                </button>
              </div>

              <div class="team-squads-table-wrapper">
                <table class="edit-squads-table">
                  <thead>
                    <tr>
                      <th width="150">小隊名</th>
                      <th width="150">職能</th>
                      <th>備註</th>
                      <th width="70" class="text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(sq, sIdx) in currentEditingTeam.squads" :key="sq.id">
                      <td>
                        <input type="text" v-model="sq.name" maxlength="8" class="table-input" />
                      </td>
                      <td>
                        <select v-model="sq.zhineng" class="table-select flex-1">
                          <option value="">選擇職能</option>
                          <option v-for="roleOpt in squadRoleOptions" :key="roleOpt" :value="roleOpt">
                            {{ roleOpt }}
                          </option>
                        </select>
                      </td>
                      <td>
                        <input type="text" v-model="sq.desc" placeholder="選填" class="table-input" />
                      </td>
                      <td class="text-center">
                        <button class="btn-link text-red" @click="deleteSquadFromEditingTeam(currentEditingTeam, sIdx)">刪除</button>
                      </td>
                    </tr>
                    <tr v-if="currentEditingTeam.squads.length === 0">
                      <td colspan="4" class="empty-cell-sm">暫無小隊，點右上角「+ 添加小隊」新增</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer space-between">
          <button class="btn-primary" @click="showEditTeamModal = false">確定</button>
          <button class="btn-secondary" @click="showEditTeamModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 4. 排表信息 Modal -->
    <div v-if="showSlotInfoModal" class="modal-overlay" @click.self="showSlotInfoModal = false">
      <div class="modal-card slot-info-modal" @click.stop>
        <div class="modal-header">
          <h3>排表信息</h3>
          <div class="modal-header-actions">
            <button class="btn-link" @click="openFullMemberEditModal(activeSlotForModal?.assignedMember)">修改成員</button>
            <button class="btn-link text-red margin-l" @click="removeMemberFromSlot(activeSlotForModal)">移除席位</button>
            <span class="close-btn margin-l" @click="showSlotInfoModal = false">&times;</span>
          </div>
        </div>

        <div class="modal-body">
          <div class="slot-member-profile-card">
            <img :src="getSchoolImgByName(activeSlotForModal?.assignedMember?.currentSchool)" class="profile-school-img" />
            <div class="profile-text-group">
              <span class="profile-name">{{ activeSlotForModal?.assignedMember?.name }}</span>
              <span class="profile-school-tag">{{ activeSlotForModal?.assignedMember?.currentSchool }}</span>
            </div>
          </div>

          <div class="info-details-box margin-t">
            <div class="info-row">
              <span class="info-label">職能偏好：</span>
              <span class="info-val">{{ formatArrayText(activeSlotForModal?.assignedMember?.rolePreference) }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">一線牽：</span>
              <span class="info-val">{{ activeSlotForModal?.assignedMember?.tether || '—' }}</span>
            </div>
          </div>

          <div class="form-block margin-t">
            <div class="block-title">◆ 聯賽職能</div>
            <div class="role-pills-grid margin-t">
              <button 
                v-for="r in personalRoleOptions" 
                :key="r"
                :class="['role-pill-btn', { active: tempSlotRoles.includes(r) }]"
                @click="toggleTempSlotRole(r)"
              >
                {{ r }}
              </button>
            </div>
          </div>

          <div class="form-block margin-t">
            <div class="block-title">◆ 推薦技能</div>
            
            <div class="skill-input-row margin-t">
              <label>絕技：</label>
              <div class="custom-dropdown-container">
                <input type="text" v-model="tempSlotJueji" placeholder="輸入或選擇絕技" class="skill-field flex-1" />
                <button type="button" class="dropdown-toggle-btn" @click.stop="toggleSkillDropdown('jueji_info')">
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'jueji_info' }]"></i>
                </button>
                <div v-if="activeSkillDropdown === 'jueji_info'" class="skill-dropdown-panel" @click.stop>
                  <div v-for="j in juejiOptions" :key="j" class="dropdown-item" @mousedown.prevent.stop="tempSlotJueji = j; activeSkillDropdown = null">
                    {{ j }}
                  </div>
                </div>
              </div>
            </div>

            <div class="skill-input-row margin-t">
              <label>群俠百家：</label>
              <div class="custom-dropdown-container">
                <input type="text" v-model="tempSlotQunxia" placeholder="輸入或選擇群俠百家" class="skill-field flex-1" />
                <button type="button" class="dropdown-toggle-btn" @click.stop="toggleSkillDropdown('qunxia_info')">
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'qunxia_info' }]"></i>
                </button>
                <div v-if="activeSkillDropdown === 'qunxia_info'" class="skill-dropdown-panel" @click.stop>
                  <div 
                    v-for="q in qunxiaOptions" 
                    :key="q" 
                    :class="['dropdown-item', { selected: isInfoQunxiaSelected(q) }]" 
                    @mousedown.prevent.stop="toggleInfoQunxia(q)"
                  >
                    <span>{{ q }}</span>
                    <i v-if="isInfoQunxiaSelected(q)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="skill-input-row margin-t">
              <label>流派技能：</label>
              <div class="custom-dropdown-container">
                <input type="text" v-model="tempSlotZhuangbei" placeholder="輸入或選擇流派技能" class="skill-field flex-1" />
                <button type="button" class="dropdown-toggle-btn" @click.stop="toggleSkillDropdown('liupai_info')">
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'liupai_info' }]"></i>
                </button>
                <div v-if="activeSkillDropdown === 'liupai_info'" class="skill-dropdown-panel" @click.stop>
                  <div 
                    v-for="l in liupaiSkillOptions" 
                    :key="l" 
                    :class="['dropdown-item', { selected: isInfoLiupaiSelected(l) }]" 
                    @mousedown.prevent.stop="toggleInfoLiupai(l)"
                  >
                    <span>{{ l }}</span>
                    <i v-if="isInfoLiupaiSelected(l)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer space-between">
          <button class="btn-primary" @click="saveSlotInfo">保存</button>
          <button class="btn-secondary" @click="showSlotInfoModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 5. 席位配置 Modal -->
    <div v-if="showSlotConfigModal" class="modal-overlay" @click.self="showSlotConfigModal = false">
      <div class="modal-card slot-modal-card" @click.stop>
        <div class="modal-header">
          <h3>席位配置</h3>
          <span class="close-btn" @click="showSlotConfigModal = false">&times;</span>
        </div>

        <div class="modal-body">
          <div class="slot-location-tag">
            {{ activeSlotTeamName }} - {{ activeSlotSquadName }} - 第 {{ activeSlotIndex + 1 }} 席
          </div>

          <div class="form-block">
            <div class="block-title"><span class="req">*</span>推薦流派</div>
            <div class="school-pills-group">
              <button 
                v-for="s in availableSchools" 
                :key="s.name"
                :class="['school-btn-card', { active: tempConfigSchools.includes(s.name) }]"
                :style="{ '--badge-color': s.color, '--badge-bg': s.bg }"
                @click="toggleConfigSchool(s.name)"
              >
                <img :src="getSchoolImg(s.file)" class="btn-img-icon" />
                <span>{{ s.name }}</span>
              </button>
            </div>
          </div>

          <!-- 推薦職能 (動態帶入 13 項個人職能) -->
          <div class="form-block margin-t">
            <div class="block-title">推薦職能</div>
            <div class="role-tag-grid">
              <button 
                v-for="rName in personalRoleOptions" 
                :key="rName"
                :class="['role-tag-btn', { active: tempConfigRoles.includes(rName) }]"
                @click="toggleConfigRole(rName)"
              >
                {{ rName }}
              </button>
            </div>
          </div>

          <div class="form-block margin-t">
            <div class="block-title">推薦技能</div>
            
            <div class="skill-input-row margin-t">
              <label>絕技：</label>
              <div class="custom-dropdown-container">
                <input type="text" v-model="tempConfigJueji" placeholder="輸入或選擇絕技" class="skill-field flex-1" />
                <button type="button" class="dropdown-toggle-btn" @click.stop="toggleSkillDropdown('jueji_cfg')">
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'jueji_cfg' }]"></i>
                </button>
                <div v-if="activeSkillDropdown === 'jueji_cfg'" class="skill-dropdown-panel" @click.stop>
                  <div v-for="j in juejiOptions" :key="j" class="dropdown-item" @mousedown.prevent.stop="tempConfigJueji = j; activeSkillDropdown = null">
                    {{ j }}
                  </div>
                </div>
              </div>
            </div>

            <div class="skill-input-row margin-t">
              <label>群俠百家：</label>
              <div class="custom-select-wrapper flex-1" @click.stop>
                <input type="text" v-model="tempConfigQunxia" placeholder="輸入或選擇群俠百家" class="skill-field flex-1" />
                <button type="button" class="dropdown-toggle-btn" @click.stop="toggleSkillDropdown('qunxia_cfg')">
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'qunxia_cfg' }]"></i>
                </button>
                <div v-if="activeSkillDropdown === 'qunxia_cfg'" class="skill-dropdown-panel" @click.stop>
                  <div 
                    v-for="q in qunxiaOptions" 
                    :key="q" 
                    :class="['dropdown-item', { selected: isConfigQunxiaSelected(q) }]" 
                    @mousedown.prevent.stop="toggleConfigQunxia(q)"
                  >
                    <span>{{ q }}</span>
                    <i v-if="isConfigQunxiaSelected(q)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>

            <div class="skill-input-row margin-t">
              <label>流派技能：</label>
              <div class="custom-dropdown-container">
                <input type="text" v-model="tempConfigZhuangbei" placeholder="輸入或選擇流派技能" class="skill-field flex-1" />
                <button type="button" class="dropdown-toggle-btn" @click.stop="toggleSkillDropdown('liupai_cfg')">
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'liupai_cfg' }]"></i>
                </button>
                <div v-if="activeSkillDropdown === 'liupai_cfg'" class="skill-dropdown-panel" @click.stop>
                  <div 
                    v-for="l in liupaiSkillOptions" 
                    :key="l" 
                    :class="['dropdown-item', { selected: isConfigLiupaiSelected(l) }]" 
                    @mousedown.prevent.stop="toggleConfigLiupai(l)"
                  >
                    <span>{{ l }}</span>
                    <i v-if="isConfigLiupaiSelected(l)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="form-block margin-t">
            <div class="block-title">描述</div>
            <textarea v-model="tempConfigDesc" maxlength="200" placeholder="選填，例如這部分的戰術職能" class="skill-textarea h-80 margin-t"></textarea>
          </div>
        </div>

        <div class="modal-footer space-between">
          <button class="btn-primary" @click="saveSlotConfig">確定</button>
          <button class="btn-secondary" @click="showSlotConfigModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 6. 編輯成員數據 Modal -->
    <div v-if="showMemberEditModal" class="modal-overlay" @click.self="showMemberEditModal = false">
      <div class="modal-card large-card">
        <div class="modal-header">
          <h3>編輯成員</h3>
          <span class="close-btn" @click="showMemberEditModal = false">&times;</span>
        </div>
        <div class="modal-body form-grid">
          <div class="form-section">
            <h4 class="section-title">基礎資訊</h4>
            
            <div class="form-row">
              <label><span class="req">*</span>角色名：</label>
              <input type="text" v-model="memberEditForm.name" placeholder="請輸入角色名" class="flex-1 input-field" />
            </div>

            <div class="form-row">
              <label><span class="req">*</span>流派列表：</label>
              <div class="school-selector">
                <button 
                  v-for="s in availableSchools" 
                  :key="s.name" 
                  :class="['school-btn-card', { active: memberEditForm.schools.includes(s.name) }]"
                  :style="{ '--badge-color': s.color, '--badge-bg': s.bg }"
                  @click="toggleMemberEditSchool(s.name)"
                >
                  <img :src="getSchoolImg(s.file)" class="btn-img-icon" />
                  <span>{{ s.name }}</span>
                </button>
              </div>
            </div>

            <div class="form-row" v-if="memberEditForm.schools.length > 0">
              <label><span class="req">*</span>當前流派：</label>
              <select v-model="memberEditForm.currentSchool" class="flex-1 select-field">
                <option v-for="s in memberEditForm.schools" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div class="form-row">
              <label>神兵：</label>
              <input type="checkbox" v-model="memberEditForm.hasGodlyWeapon" />
            </div>

            <div class="form-row">
              <label>所屬幫會：</label>
              <select v-model="memberEditForm.guild" class="flex-1 select-field" disabled>
                <option :value="leagueInfo.guild">{{ leagueInfo.guild }}</option>
              </select>

              <label class="margin-l">幫眾狀態：</label>
              <select v-model="memberEditForm.status" class="flex-1 select-field">
                <option value="幫眾">幫眾</option>
                <option value="學徒">學徒</option>
                <option value="退幫">退幫</option>
              </select>
            </div>

            <div class="form-row">
              <label>聯繫方式：</label>
              <input type="text" v-model="memberEditForm.contact" placeholder="DC名稱" class="flex-1 input-field" />
            </div>

            <div class="form-row">
              <label>成員備註：</label>
              <input type="text" v-model="memberEditForm.notes" placeholder="請輸入備註" class="flex-1 input-field" />
            </div>

            <div class="form-row">
              <label>一線牽：</label>
              <input type="text" v-model="memberEditForm.tether" placeholder="輸入角色名搜尋" class="flex-1 input-field" />
            </div>

            <div class="form-row align-start">
              <label>職能偏好：</label>
              <div class="custom-select-wrapper flex-1" @click.stop>
                <div class="custom-select-input" @click="showRoleDropdownInMemberEdit = !showRoleDropdownInMemberEdit">
                  <span>{{ memberEditForm.rolePrefList.length > 0 ? memberEditForm.rolePrefList.join(', ') : '未設置 (可多選)' }}</span>
                  <i class="mdi mdi-chevron-down select-arrow"></i>
                </div>
                <div v-if="showRoleDropdownInMemberEdit" class="custom-select-dropdown">
                  <div 
                    v-for="r in personalRoleOptions" 
                    :key="r" 
                    :class="['dropdown-item', { selected: memberEditForm.rolePrefList.includes(r) }]"
                    @click="toggleRolePrefInMemberEdit(r)"
                  >
                    <span>{{ r }}</span>
                    <i v-if="memberEditForm.rolePrefList.includes(r)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer space-between">
          <button class="btn-primary" @click="saveFullMemberEdit">提交</button>
          <button class="btn-secondary" @click="showMemberEditModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 7. 新增成員 Modal -->
    <div v-if="showAddMemberModal" class="modal-overlay" @click.self="showAddMemberModal = false">
      <div class="modal-card large-card">
        <div class="modal-header">
          <h3>新增成員至【{{ leagueInfo.guild || '授權幫會' }}】</h3>
          <span class="close-btn" @click="showAddMemberModal = false">&times;</span>
        </div>
        <div class="modal-body form-grid">
          <div class="form-section">
            <h4 class="section-title">基礎資訊</h4>
            
            <div class="form-row">
              <label><span class="req">*</span>角色名：</label>
              <input type="text" v-model="newMemberForm.name" placeholder="請輸入角色名" class="flex-1 input-field" />
            </div>

            <div class="form-row">
              <label><span class="req">*</span>流派列表：</label>
              <div class="school-selector">
                <button 
                  v-for="s in availableSchools" 
                  :key="s.name" 
                  :class="['school-btn-card', { active: newMemberForm.schools.includes(s.name) }]"
                  :style="{ '--badge-color': s.color, '--badge-bg': s.bg }"
                  @click="toggleNewMemberSchool(s.name)"
                >
                  <img :src="getSchoolImg(s.file)" class="btn-img-icon" />
                  <span>{{ s.name }}</span>
                </button>
              </div>
            </div>

            <div class="form-row" v-if="newMemberForm.schools.length > 0">
              <label><span class="req">*</span>當前流派：</label>
              <select v-model="newMemberForm.currentSchool" class="flex-1 select-field">
                <option v-for="s in newMemberForm.schools" :key="s" :value="s">{{ s }}</option>
              </select>
            </div>

            <div class="form-row">
              <label>神兵：</label>
              <input type="checkbox" v-model="newMemberForm.hasGodlyWeapon" />
            </div>

            <div class="form-row">
              <label>所屬幫會：</label>
              <select v-model="newMemberForm.guild" class="flex-1 select-field">
                <option :value="leagueInfo.guild">{{ leagueInfo.guild }}</option>
              </select>

              <label class="margin-l">幫眾狀態：</label>
              <select v-model="newMemberForm.status" class="flex-1 select-field">
                <option value="幫眾">幫眾</option>
                <option value="學徒">學徒</option>
                <option value="退幫">退幫</option>
              </select>
            </div>

            <div class="form-row">
              <label>聯繫方式：</label>
              <input type="text" v-model="newMemberForm.contact" placeholder="DC名稱" class="flex-1 input-field" />
            </div>

            <div class="form-row">
              <label>成員備註：</label>
              <input type="text" v-model="newMemberForm.notes" placeholder="請輸入備註" class="flex-1 input-field" />
            </div>

            <div class="form-row">
              <label>一線牽：</label>
              <input type="text" v-model="newMemberForm.tether" placeholder="輸入角色名搜尋" class="flex-1 input-field" />
            </div>

            <div class="form-row align-start">
              <label>職能偏好：</label>
              <div class="custom-select-wrapper flex-1" @click.stop>
                <div class="custom-select-input" @click="showRoleDropdownInNewMember = !showRoleDropdownInNewMember">
                  <span>{{ newMemberForm.rolePrefList.length > 0 ? newMemberForm.rolePrefList.join(', ') : '未設置 (可多選)' }}</span>
                  <i class="mdi mdi-chevron-down select-arrow"></i>
                </div>
                <div v-if="showRoleDropdownInNewMember" class="custom-select-dropdown">
                  <div 
                    v-for="r in personalRoleOptions" 
                    :key="r" 
                    :class="['dropdown-item', { selected: newMemberForm.rolePrefList.includes(r) }]"
                    @click="toggleRolePrefInNewMember(r)"
                  >
                    <span>{{ r }}</span>
                    <i v-if="newMemberForm.rolePrefList.includes(r)" class="mdi mdi-check check-icon"></i>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer space-between">
          <button class="btn-primary" @click="saveNewMember">提交</button>
          <button class="btn-secondary" @click="showAddMemberModal = false">取消</button>
        </div>
      </div>
    </div>

    <!-- 8. 置中刪除確認 Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="showConfirmModal = false">
      <div class="modal-card confirm-modal-card">
        <div class="confirm-modal-body">
          <div class="warning-icon-wrapper">
            <i class="mdi mdi-alert-circle warning-icon"></i>
          </div>
          <h3 class="confirm-title">{{ confirmTitle }}</h3>
          <p class="confirm-msg">{{ confirmMessage }}</p>
        </div>
        <div class="confirm-modal-footer space-between">
          <button class="btn-primary btn-red" @click="executeConfirmAction">確定</button>
          <button class="btn-secondary" @click="showConfirmModal = false">取消</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { supabase } from '../../utils/supabase'
import RosterSidebar from './components/RosterSidebar.vue'
import RosterMatrixView from './components/RosterMatrixView.vue'
import RosterTableView from './components/RosterTableView.vue'

const props = defineProps({
  leagueItem: {
    type: Object,
    default: () => ({
      title: '幫會聯賽',
      type: '幫會聯賽',
      startTime: '2026-10-10 20:00',
      guild: '百錵谷酒池肉林',
      participant: '百錵谷酒池肉林'
    })
  },
  userProfile: {
    type: Object,
    default: () => null
  }
})

defineEmits(['back'])

// 常數宣告 (最頂層)
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
  { name: '滄瀾', file: 'cl', color: '#0284c7', bg: '#e0e7ff' }
]

const teamColorOptions = [
  { color: '#84cc16', label: '淺綠色' },
  { color: '#eab308', label: '金黃色' },
  { color: '#06b6d4', label: '淺藍色' },
  { color: '#3b82f6', label: '深藍色' },
  { color: '#a855f7', label: '淡紫色' }
]

const schoolColorMap = {
  '鐵衣': '#fef3c7', '血河': '#ffe4e6', '九靈': '#f3e8ff', '神相': '#e0e7ff',
  '碎夢': '#cffaff', '素問': '#ffe4e6', '龍吟': '#d1fae5', '玄機': '#ecfccb',
  '潮光': '#f0f9ff', '滄瀾': '#e0e7ff'
}

// 所有 State 宣告
const allMembers = ref([])
const isSaving = ref(false)
const showSecondarySchool = ref(false)
const showDetails = ref(false)
const layoutMode = ref('matrix')

const showOtherOpsDropdown = ref(false)
const showTemplateDropdown = ref(false)
const appliedTemplateName = ref('')
const activeSkillDropdown = ref(null)

// 新版 13 項個人與 5 項小隊職能預設
const DEFAULT_PERSONAL_ROLES = [
  '保鑣', '埋頭猛拆', '塔仇御鐵', '潮砲', '奶絕奶',
  '增益奶', '輔潮', '燒屍體', '騰龍合軸', '拆塔指揮',
  '保鑣指揮', '防守指揮', '點殺'
]
const DEFAULT_SQUAD_ROLES = ['保鑣隊', '拆塔隊', '塔前隊', '塔後隊', '防守隊']
const DEFAULT_JUEJI = ['太極圖', '奶絕', '鈞天浩意', '蝶舞清夢', '花縈凌波', '九天雷引', '冰火絕滅', '昀光神劍', '大鬧天宮', '劍魂沖霄', '天遁白虹', '殘心三絕劍', '九靈本家絕', '騰龍躍淵']
const DEFAULT_QUNXIA = ['咚咚跳台', '冰牆', '風雪載圖。同歸', '不攻', '雲影濯香', '潮傾浪野', '清弦鳴絕', '不動禪心', '四大皆空', '心眼無量', '猿戲功', '流月無痕']
const DEFAULT_LIUPAI = ['約定', '山盟', '清泉', '鐵壁', '碧海靈佑']

const personalRoleOptions = ref([...DEFAULT_PERSONAL_ROLES])
const squadRoleOptions = ref([...DEFAULT_SQUAD_ROLES])
const juejiOptions = ref([...DEFAULT_JUEJI])
const qunxiaOptions = ref([...DEFAULT_QUNXIA])
const liupaiSkillOptions = ref([...DEFAULT_LIUPAI])

// Modals State
const showExportModal = ref(false)
const isExporting = ref(false)
const exportHeaderTitleVisible = ref(true)
const exportHeaderNoteVisible = ref(true)
const exportVisibleTeamIds = ref([])

const showSwapSquadModal = ref(false)
const swapOptions = ref({ name: true, zhineng: true, desc: true, template: true })

const showBatchEditModal = ref(false)
const selectedBatchMembers = ref([])
const batchMemberGroups = ref([])
const activeBatchDropdown = ref(null)

const showBatchRoleDialog = ref(false)
const tempBatchRolePills = ref([])
const showBatchJuejiDialog = ref(false)
const tempBatchJuejiVal = ref('')
const showBatchQunxiaDialog = ref(false)
const tempBatchQunxiaVal = ref('')
const showBatchLiupaiDialog = ref(false)
const tempBatchLiupaiVal = ref('')

const showEditTeamModal = ref(false)
const activeEditTeamIndex = ref(0)

const showSlotInfoModal = ref(false)
const showSlotConfigModal = ref(false)
const activeSlotForModal = ref(null)
const activeSlotTeamName = ref('')
const activeSlotSquadName = ref('')
const activeSlotIndex = ref(0)

const tempSlotRoles = ref([])
const tempSlotJueji = ref('')
const tempSlotQunxia = ref('')
const tempSlotZhuangbei = ref('')

const tempConfigSchools = ref([])
const tempConfigRoles = ref([])
const tempConfigJueji = ref('')
const tempConfigQunxia = ref('')
const tempConfigZhuangbei = ref('')
const tempConfigDesc = ref('')

const showMemberEditModal = ref(false)
const showRoleDropdownInMemberEdit = ref(false)
const editingMemberRef = ref(null)
const memberEditForm = ref({
  name: '', schools: ['鐵衣'], currentSchool: '鐵衣',
  hasGodlyWeapon: false, guild: '', status: '幫眾',
  contact: '', notes: '', tether: '', rolePrefList: []
})

const showAddMemberModal = ref(false)
const showRoleDropdownInNewMember = ref(false)
const newMemberForm = ref({
  name: '', schools: ['鐵衣'], currentSchool: '鐵衣',
  hasGodlyWeapon: false, guild: '', status: '幫眾',
  contact: '', notes: '', tether: '', rolePrefList: []
})

const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
let confirmActionCallback = null

// 團隊盤面矩陣資料 State
const matrixTeams = ref([
  {
    id: 1,
    name: '進攻一團',
    desc: '我是團隊備註會顯示的地方',
    color: '#84cc16',
    squads: Array.from({ length: 5 }, (_, i) => ({
      id: 10 + i,
      name: `${i + 1}隊`,
      zhineng: i === 0 ? '拆塔隊' : (i === 1 ? '保鑣隊' : ''),
      desc: '',
      slots: createDefaultSlots()
    }))
  }
])

function createDefaultSlots() {
  return Array.from({ length: 6 }, () => ({
    id: Math.random(),
    assignedMember: null,
    roles: [],
    jueji: '', qunxia: '', zhuangbei: '',
    templateConfig: { schools: [], roles: [], jueji: '', qunxia: '', zhuangbei: '', desc: '' }
  }))
}

// Computed 計算屬性
const leagueInfo = computed(() => {
  const item = props.leagueItem || {}
  const gName = item.participant || item.guild || '百錵谷酒池肉林'
  return { ...item, guild: gName, participant: gName }
})

const assignedMemberIds = computed(() => {
  const set = new Set()
  if (Array.isArray(matrixTeams.value)) {
    matrixTeams.value.forEach(team => {
      team.squads?.forEach(squad => {
        squad.slots?.forEach(slot => {
          if (slot.assignedMember?.id) {
            set.add(slot.assignedMember.id)
          }
        })
      })
    })
  }
  return set
})

const schoolAssignedCounts = computed(() => {
  const counts = {}
  availableSchools.forEach(s => counts[s.name] = 0)

  if (Array.isArray(matrixTeams.value)) {
    matrixTeams.value.forEach(team => {
      if (team && Array.isArray(team.squads)) {
        team.squads.forEach(squad => {
          if (squad && Array.isArray(squad.slots)) {
            squad.slots.forEach(slot => {
              if (slot?.assignedMember?.currentSchool) {
                const sch = slot.assignedMember.currentSchool
                if (counts[sch] !== undefined) counts[sch]++
              }
            })
          }
        })
      }
    })
  }
  return counts
})

const exportFilteredTeams = computed(() => {
  return matrixTeams.value.filter(team => exportVisibleTeamIds.value.includes(team.id))
})

const currentEditingTeam = computed(() => {
  if (!Array.isArray(matrixTeams.value)) return null
  return matrixTeams.value[activeEditTeamIndex.value] || null
})

// 方法與事件
const updateMembersAssignedStatus = () => {
  if (Array.isArray(allMembers.value)) {
    allMembers.value.forEach(m => {
      if (m) {
        m.assigned = assignedMemberIds.value.has(m.id)
      }
    })
  }
}

watch(assignedMemberIds, () => {
  updateMembersAssignedStatus()
}, { immediate: true })

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  const found = availableSchools.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

const getRowSchoolBgStyle = (schoolName) => {
  const bg = schoolColorMap[schoolName] || '#ffffff'
  return { backgroundColor: bg }
}

// ★ 核心修復：雙重映射 (s.content || s.name) 與 .filter(Boolean) 確保選單讀出文字，不呈現空白 ★
const fetchPrepDataFromDB = async (guildId) => {
  try {
    let rQuery = supabase.from('preparation_roles').select('*')
    if (guildId) rQuery = rQuery.or(`guild_id.eq.${guildId},guild_id.is.null`)
    const { data: rData } = await rQuery

    if (rData && rData.length > 0) {
      const pList = rData.filter(r => r.type === 'personal' && r.is_enabled !== false).map(r => r.name).filter(Boolean)
      const sList = rData.filter(r => r.type === 'squad' && r.is_enabled !== false).map(r => r.name).filter(Boolean)
      if (pList.length > 0) personalRoleOptions.value = pList
      if (sList.length > 0) squadRoleOptions.value = sList
    }

    let sQuery = supabase.from('preparation_skills').select('*')
    if (guildId) sQuery = sQuery.or(`guild_id.eq.${guildId},guild_id.is.null`)
    const { data: skData } = await sQuery

    if (skData && skData.length > 0) {
      const jList = skData.filter(s => s.category === 'jueji' && s.is_enabled !== false).map(s => s.content || s.name).filter(Boolean)
      const qList = skData.filter(s => s.category === 'qunxia' && s.is_enabled !== false).map(s => s.content || s.name).filter(Boolean)
      const lList = skData.filter(s => s.category === 'liupai' && s.is_enabled !== false).map(s => s.content || s.name).filter(Boolean)

      if (jList.length > 0) juejiOptions.value = jList
      if (qList.length > 0) qunxiaOptions.value = qList
      if (lList.length > 0) liupaiSkillOptions.value = lList
    }
  } catch (err) {
    console.warn('載入戰備資料備用:', err)
  }
}

const toggleSkillDropdown = (type) => {
  if (activeSkillDropdown.value === type) activeSkillDropdown.value = null
  else activeSkillDropdown.value = type
}

const closeAllSkillDropdowns = () => {
  activeSkillDropdown.value = null
  showOtherOpsDropdown.value = false
  showTemplateDropdown.value = false
  activeBatchDropdown.value = null
}

const fetchRosterDataFromDB = async () => {
  const targetGuildName = leagueInfo.value.guild

  const { data: guildsData } = await supabase.from('guilds').select('*')
  let targetGuildId = props.leagueItem?.guild_id

  if (!targetGuildId && guildsData) {
    const foundG = guildsData.find(g => g.name === targetGuildName)
    if (foundG) targetGuildId = foundG.id
  }

  await fetchPrepDataFromDB(targetGuildId)

  const { data: membersData, error: memberErr } = await supabase.from('guild_members').select('*')

  if (!memberErr && membersData) {
    let matchedMembers = membersData.filter(m => {
      if (targetGuildId && m.guild_id === targetGuildId) return true
      const mGuildName = guildsData?.find(g => g.id === m.guild_id)?.name
      if (targetGuildName && mGuildName === targetGuildName) return true
      return false
    })

    if (matchedMembers.length === 0 && membersData.length > 0) {
      matchedMembers = membersData
    }

    allMembers.value = matchedMembers.map(m => {
      const currSch = (m.current_school || m.currentSchool || (m.schools && m.schools[0]) || '鐵衣').trim()
      const schList = (m.schools && m.schools.length > 0) ? m.schools : [currSch]
      return {
        id: m.id,
        name: m.name || '未知',
        formerNames: m.former_names || [],
        schools: schList,
        currentSchool: currSch,
        hasGodlyWeapon: m.has_godly_weapon || false,
        guild: targetGuildName,
        status: m.status || '幫眾',
        contact: m.contact || '',
        notes: m.notes || '',
        tether: m.tether || '',
        rolePreference: m.role_preference || [],
        rolePrefList: m.role_preference || [],
        assigned: false
      }
    })

    updateMembersAssignedStatus()
  }

  let rosterData = null
  if (props.leagueItem?.id) {
    const { data } = await supabase
      .from('guild_rosters')
      .select('*')
      .eq('id', props.leagueItem.id)
      .maybeSingle()
    rosterData = data
  }

  if (rosterData && rosterData.matrix_teams && rosterData.matrix_teams.length > 0) {
    matrixTeams.value = rosterData.matrix_teams
    updateMembersAssignedStatus()
  }
}

const saveRosterBoard = async () => {
  isSaving.value = true
  try {
    let error = null
    if (props.leagueItem?.id) {
      const res = await supabase
        .from('guild_rosters')
        .update({
          matrix_teams: matrixTeams.value,
          updated_at: new Date().toISOString()
        })
        .eq('id', props.leagueItem.id)
      error = res.error
    }

    if (error) throw error
    alert('陣容成功儲存至雲端資料庫！同幫會成員登入即可看到最新排表。')
  } catch (err) {
    console.error('儲存失敗:', err)
    alert('陣容保存失敗：' + err.message)
  } finally {
    isSaving.value = false
  }
}

const openExportPreviewModal = () => {
  exportVisibleTeamIds.value = matrixTeams.value.map(t => t.id)
  exportHeaderTitleVisible.value = true
  exportHeaderNoteVisible.value = true
  showExportModal.value = true
}

const loadHtml2CanvasScript = () => {
  return new Promise((resolve, reject) => {
    if (window.html2canvas) return resolve(window.html2canvas)
    const script = document.createElement('script')
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
    script.onload = () => resolve(window.html2canvas)
    script.onerror = (err) => reject(err)
    document.head.appendChild(script)
  })
}

const downloadExportImage = async () => {
  const targetEl = document.querySelector('.preview-canvas-paper')
  if (!targetEl) return alert('找不到預覽畫面！')

  isExporting.value = true
  try {
    const html2canvas = await loadHtml2CanvasScript()
    const canvas = await html2canvas(targetEl, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false
    })
    
    const image = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = image
    link.download = `${leagueInfo.value.guild}_${leagueInfo.value.title}.png`
    link.click()

    showExportModal.value = false
  } catch (err) {
    alert('導出圖片失敗，請稍微重試。')
  } finally {
    isExporting.value = false
  }
}

const openAddMemberModal = () => {
  newMemberForm.value = {
    name: '',
    schools: ['鐵衣'],
    currentSchool: '鐵衣',
    hasGodlyWeapon: false,
    guild: leagueInfo.value.guild,
    status: '幫眾',
    contact: '',
    notes: '',
    tether: '',
    rolePrefList: []
  }
  showAddMemberModal.value = true
}

const toggleNewMemberSchool = (sName) => {
  const idx = newMemberForm.value.schools.indexOf(sName)
  if (idx > -1) {
    if (newMemberForm.value.schools.length > 1) {
      newMemberForm.value.schools.splice(idx, 1)
      if (newMemberForm.value.currentSchool === sName) {
        newMemberForm.value.currentSchool = newMemberForm.value.schools[0]
      }
    }
  } else {
    if (newMemberForm.value.schools.length >= 2) return alert('最多只能選擇 2 個流派！')
    newMemberForm.value.schools.push(sName)
  }
}

const toggleRolePrefInNewMember = (rName) => {
  const idx = newMemberForm.value.rolePrefList.indexOf(rName)
  if (idx > -1) newMemberForm.value.rolePrefList.splice(idx, 1)
  else newMemberForm.value.rolePrefList.push(rName)
}

const saveNewMember = async () => {
  const cleanName = newMemberForm.value.name.trim()
  if (!cleanName) return alert('請輸入角色名！')

  const { data: gData } = await supabase.from('guilds').select('id').eq('name', leagueInfo.value.guild).maybeSingle()

  if (gData) {
    const { error } = await supabase.from('guild_members').insert([{
      guild_id: gData.id,
      name: cleanName,
      schools: newMemberForm.value.schools,
      current_school: newMemberForm.value.currentSchool,
      has_godly_weapon: newMemberForm.value.hasGodlyWeapon,
      status: newMemberForm.value.status,
      contact: newMemberForm.value.contact.trim(),
      notes: newMemberForm.value.notes.trim(),
      tether: newMemberForm.value.tether.trim(),
      role_preference: newMemberForm.value.rolePrefList
    }])

    if (error) return alert('新增成員失敗：' + error.message)
  }

  await fetchRosterDataFromDB()
  showAddMemberModal.value = false
}

const addTeam = () => {
  if (matrixTeams.value.length >= 5) return alert('最多只能創建 5 個團隊！')
  const num = matrixTeams.value.length + 1
  const defaultColor = teamColorOptions[(num - 1) % teamColorOptions.length].color
  matrixTeams.value.push({
    id: Date.now(),
    name: `團隊 ${num}`,
    desc: '',
    color: defaultColor,
    squads: Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      name: `${i + 1}隊`,
      zhineng: '',
      desc: '',
      slots: createDefaultSlots()
    }))
  })
}

const addSquadToTeam = (team) => {
  if (team.squads.length >= 5) return alert('每個團隊最多只能創建 5 個小隊！')
  const squadNum = team.squads.length + 1
  team.squads.push({
    id: Date.now(),
    name: `${squadNum}隊`,
    zhineng: '',
    desc: '',
    slots: createDefaultSlots()
  })
}

// 拖拽與交換
let draggedType = null
let draggedPendingMember = null
let draggedSlotRef = null
let draggedSquadRef = null
let targetSquadRef = null

const onDragStartPendingMember = (member) => {
  draggedType = 'pendingMember'
  draggedPendingMember = member
}

const onDragStartSlot = ({ team, squad, slot }) => {
  if (!slot.assignedMember) return
  draggedType = 'slotMember'
  draggedSlotRef = slot
}

const onDragStartSquad = ({ team, squad }) => {
  draggedType = 'squad'
  draggedSquadRef = squad
}

const onDropOnSlot = ({ team, squad, slot: targetSlot }) => {
  if (draggedType === 'pendingMember' && draggedPendingMember) {
    if (targetSlot.assignedMember) targetSlot.assignedMember.assigned = false
    targetSlot.assignedMember = draggedPendingMember
    draggedPendingMember.assigned = true
    if (draggedPendingMember.rolePreference) {
      targetSlot.roles = [...draggedPendingMember.rolePreference]
    }
  } else if (draggedType === 'slotMember' && draggedSlotRef) {
    if (draggedSlotRef === targetSlot) return
    const tempMember = targetSlot.assignedMember
    const tempRoles = Array.isArray(targetSlot.roles) ? [...targetSlot.roles] : []
    const tempJueji = targetSlot.jueji
    const tempQunxia = targetSlot.qunxia
    const tempZhuangbei = targetSlot.zhuangbei

    targetSlot.assignedMember = draggedSlotRef.assignedMember
    targetSlot.roles = Array.isArray(draggedSlotRef.roles) ? [...draggedSlotRef.roles] : []
    targetSlot.jueji = draggedSlotRef.jueji
    targetSlot.qunxia = draggedSlotRef.qunxia
    targetSlot.zhuangbei = draggedSlotRef.zhuangbei

    draggedSlotRef.assignedMember = tempMember
    draggedSlotRef.roles = tempRoles
    draggedSlotRef.jueji = tempJueji
    draggedSlotRef.qunxia = tempQunxia
    draggedSlotRef.zhuangbei = tempZhuangbei
  }

  draggedType = null
  draggedPendingMember = null
  draggedSlotRef = null
}

const onDropOnSquadColumn = ({ team, squad: targetSquad }) => {
  if (draggedType === 'squad' && draggedSquadRef && draggedSquadRef !== targetSquad) {
    targetSquadRef = targetSquad
    showSwapSquadModal.value = true
  }
}

const executeSwapSquad = () => {
  if (draggedSquadRef && targetSquadRef) {
    const tempSlots = draggedSquadRef.slots
    draggedSquadRef.slots = targetSquadRef.slots
    targetSquadRef.slots = tempSlots

    if (swapOptions.value.name) {
      const tempName = draggedSquadRef.name
      draggedSquadRef.name = targetSquadRef.name
      targetSquadRef.name = tempName
    }
    if (swapOptions.value.zhineng) {
      const tempZhineng = draggedSquadRef.zhineng
      draggedSquadRef.zhineng = targetSquadRef.zhineng
      targetSquadRef.zhineng = tempZhineng
    }
    if (swapOptions.value.desc) {
      const tempDesc = draggedSquadRef.desc
      draggedSquadRef.desc = targetSquadRef.desc
      targetSquadRef.desc = tempDesc
    }
  }

  showSwapSquadModal.value = false
  draggedType = null
  draggedSquadRef = null
  targetSquadRef = null
}

const openEditTeamModal = (idx) => {
  activeEditTeamIndex.value = idx
  showEditTeamModal.value = true
}

const deleteCurrentEditingTeam = () => {
  if (!currentEditingTeam.value) return
  triggerConfirmModal(
    '移除團隊',
    `確定要移除團隊「${currentEditingTeam.value.name}」嗎？`,
    () => {
      if (currentEditingTeam.value?.squads) {
        currentEditingTeam.value.squads.forEach(s => {
          s?.slots?.forEach(slot => {
            if (slot?.assignedMember) {
              slot.assignedMember.assigned = false
              slot.assignedMember = null
            }
          })
        })
      }
      matrixTeams.value.splice(activeEditTeamIndex.value, 1)
      if (matrixTeams.value.length === 0) showEditTeamModal.value = false
      else activeEditTeamIndex.value = Math.max(0, activeEditTeamIndex.value - 1)
    }
  )
}

const deleteSquadFromEditingTeam = (team, index) => {
  const squad = team.squads[index]
  if (squad) {
    squad.slots.forEach(slot => {
      if (slot.assignedMember) {
        slot.assignedMember.assigned = false
        slot.assignedMember = null
      }
    })
  }
  team.squads.splice(index, 1)
}

const removeMemberFromSlot = (slot) => {
  if (slot && slot.assignedMember) {
    slot.assignedMember.assigned = false
    slot.assignedMember = null
  }
  showSlotInfoModal.value = false
}

const isInfoQunxiaSelected = (qName) => typeof tempSlotQunxia.value === 'string' && tempSlotQunxia.value.split(',').map(s => s.trim()).includes(qName)
const toggleInfoQunxia = (qName) => {
  let list = (typeof tempSlotQunxia.value === 'string' && tempSlotQunxia.value) ? tempSlotQunxia.value.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(qName)
  if (idx > -1) list.splice(idx, 1)
  else list.push(qName)
  tempSlotQunxia.value = list.join(', ')
}

const isInfoLiupaiSelected = (lName) => typeof tempSlotZhuangbei.value === 'string' && tempSlotZhuangbei.value.split(',').map(s => s.trim()).includes(lName)
const toggleInfoLiupai = (lName) => {
  let list = (typeof tempSlotZhuangbei.value === 'string' && tempSlotZhuangbei.value) ? tempSlotZhuangbei.value.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(lName)
  if (idx > -1) list.splice(idx, 1)
  else list.push(lName)
  tempSlotZhuangbei.value = list.join(', ')
}

const isConfigQunxiaSelected = (qName) => typeof tempConfigQunxia.value === 'string' && tempConfigQunxia.value.split(',').map(s => s.trim()).includes(qName)
const toggleConfigQunxia = (qName) => {
  let list = (typeof tempConfigQunxia.value === 'string' && tempConfigQunxia.value) ? tempConfigQunxia.value.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(qName)
  if (idx > -1) list.splice(idx, 1)
  else list.push(qName)
  tempConfigQunxia.value = list.join(', ')
}

const isConfigLiupaiSelected = (lName) => typeof tempConfigZhuangbei.value === 'string' && tempConfigZhuangbei.value.split(',').map(s => s.trim()).includes(lName)
const toggleConfigLiupai = (lName) => {
  let list = (typeof tempConfigZhuangbei.value === 'string' && tempConfigZhuangbei.value) ? tempConfigZhuangbei.value.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(lName)
  if (idx > -1) list.splice(idx, 1)
  else list.push(lName)
  tempConfigZhuangbei.value = list.join(', ')
}

const handleSlotClick = ({ team, squad, slot, slotIdx }) => {
  activeSlotForModal.value = slot
  activeSlotTeamName.value = team.name
  activeSlotSquadName.value = squad.name
  activeSlotIndex.value = slotIdx

  if (slot.assignedMember) {
    tempSlotRoles.value = [...(slot.roles || [])]
    tempSlotJueji.value = slot.jueji || ''
    tempSlotQunxia.value = slot.qunxia || ''
    tempSlotZhuangbei.value = slot.zhuangbei || ''
    showSlotInfoModal.value = true
  } else {
    const cfg = slot.templateConfig || {}
    tempConfigSchools.value = [...(cfg.schools || [])]
    tempConfigRoles.value = [...(cfg.roles || [])]
    tempConfigJueji.value = cfg.jueji || ''
    tempConfigQunxia.value = cfg.qunxia || ''
    tempConfigZhuangbei.value = cfg.zhuangbei || ''
    tempConfigDesc.value = cfg.desc || ''
    showSlotConfigModal.value = true
  }
}

const toggleTempSlotRole = (r) => {
  const idx = tempSlotRoles.value.indexOf(r)
  if (idx > -1) tempSlotRoles.value.splice(idx, 1)
  else tempSlotRoles.value.push(r)
}

const saveSlotInfo = () => {
  if (activeSlotForModal.value) {
    activeSlotForModal.value.roles = [...tempSlotRoles.value]
    activeSlotForModal.value.jueji = tempSlotJueji.value.trim()
    activeSlotForModal.value.qunxia = tempSlotQunxia.value.trim()
    activeSlotForModal.value.zhuangbei = tempSlotZhuangbei.value.trim()
  }
  showSlotInfoModal.value = false
}

const toggleConfigSchool = (sName) => {
  const idx = tempConfigSchools.value.indexOf(sName)
  if (idx > -1) tempConfigSchools.value.splice(idx, 1)
  else tempConfigSchools.value.push(sName)
}

const toggleConfigRole = (rName) => {
  const idx = tempConfigRoles.value.indexOf(rName)
  if (idx > -1) tempConfigRoles.value.splice(idx, 1)
  else tempConfigRoles.value.push(rName)
}

const saveSlotConfig = () => {
  if (activeSlotForModal.value) {
    activeSlotForModal.value.templateConfig = {
      schools: [...tempConfigSchools.value],
      roles: [...tempConfigRoles.value],
      jueji: tempConfigJueji.value.trim(),
      qunxia: tempConfigQunxia.value.trim(),
      zhuangbei: tempConfigZhuangbei.value.trim(),
      desc: tempConfigDesc.value.trim()
    }
  }
  showSlotConfigModal.value = false
}

const openFullMemberEditModal = (member) => {
  if (!member) return
  editingMemberRef.value = member
  memberEditForm.value = {
    name: member.name,
    schools: [...(member.schools || [member.currentSchool])],
    currentSchool: member.currentSchool,
    hasGodlyWeapon: member.hasGodlyWeapon || false,
    guild: member.guild || leagueInfo.value.guild,
    status: member.status || '幫眾',
    contact: member.contact || '',
    notes: member.notes || '',
    tether: member.tether || '',
    rolePrefList: [...(member.rolePrefList || member.rolePreference || [])]
  }
  showSlotInfoModal.value = false
  showMemberEditModal.value = true
}

const toggleMemberEditSchool = (sName) => {
  const idx = memberEditForm.value.schools.indexOf(sName)
  if (idx > -1) {
    if (memberEditForm.value.schools.length > 1) {
      memberEditForm.value.schools.splice(idx, 1)
      if (memberEditForm.value.currentSchool === sName) {
        memberEditForm.value.currentSchool = memberEditForm.value.schools[0]
      }
    }
  } else {
    if (memberEditForm.value.schools.length >= 2) return alert('最多只能選擇 2 個流派！')
    memberEditForm.value.schools.push(sName)
  }
}

const toggleRolePrefInMemberEdit = (rName) => {
  const idx = memberEditForm.value.rolePrefList.indexOf(rName)
  if (idx > -1) memberEditForm.value.rolePrefList.splice(idx, 1)
  else memberEditForm.value.rolePrefList.push(rName)
}

const saveFullMemberEdit = async () => {
  const cleanName = memberEditForm.value.name.trim()
  if (!cleanName) return alert('請輸入角色名！')

  const payload = {
    name: cleanName,
    schools: memberEditForm.value.schools,
    current_school: memberEditForm.value.currentSchool,
    has_godly_weapon: memberEditForm.value.hasGodlyWeapon,
    status: memberEditForm.value.status,
    contact: memberEditForm.value.contact.trim(),
    notes: memberEditForm.value.notes.trim(),
    tether: memberEditForm.value.tether.trim(),
    role_preference: memberEditForm.value.rolePrefList
  }

  if (editingMemberRef.value?.id) {
    const { error } = await supabase
      .from('guild_members')
      .update(payload)
      .eq('id', editingMemberRef.value.id)

    if (error) {
      return alert('編輯成員同步至資料庫失敗：' + error.message)
    }
  }

  await fetchRosterDataFromDB()
  showMemberEditModal.value = false
}

const toggleBatchRowDropdown = (key) => {
  activeBatchDropdown.value = activeBatchDropdown.value === key ? null : key
}

const isBatchRowRoleSelected = (m, roleName) => Array.isArray(m?.rolesList) && m.rolesList.includes(roleName)
const toggleBatchRowRole = (m, roleName) => {
  if (!m) return
  if (!Array.isArray(m.rolesList)) m.rolesList = []
  const idx = m.rolesList.indexOf(roleName)
  if (idx > -1) m.rolesList.splice(idx, 1)
  else m.rolesList.push(roleName)
}

const isBatchRowQunxiaSelected = (m, qName) => typeof m?.qunxia === 'string' && m.qunxia.split(',').map(s => s.trim()).includes(qName)
const toggleBatchRowQunxia = (m, qName) => {
  if (!m) return
  let list = (typeof m.qunxia === 'string' && m.qunxia) ? m.qunxia.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(qName)
  if (idx > -1) list.splice(idx, 1)
  else list.push(qName)
  m.qunxia = list.join(', ')
}

const isBatchRowLiupaiSelected = (m, lName) => typeof m?.zhuangbei === 'string' && m.zhuangbei.split(',').map(s => s.trim()).includes(lName)
const toggleBatchRowLiupai = (m, lName) => {
  if (!m) return
  let list = (typeof m.zhuangbei === 'string' && m.zhuangbei) ? m.zhuangbei.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(lName)
  if (idx > -1) list.splice(idx, 1)
  else list.push(lName)
  m.zhuangbei = list.join(', ')
}

const openBatchEditModal = () => {
  try {
    const groups = []
    if (Array.isArray(matrixTeams.value)) {
      matrixTeams.value.forEach(team => {
        if (team && Array.isArray(team.squads)) {
          team.squads.forEach(squad => {
            if (squad && Array.isArray(squad.slots)) {
              const assignedSlots = squad.slots.filter(s => s && s.assignedMember)
              if (assignedSlots.length > 0) {
                groups.push({
                  title: `${team.name || ''}--${squad.name || ''}`,
                  members: assignedSlots.map(s => ({
                    slotId: s.id || Math.random(),
                    slotRef: s,
                    name: s.assignedMember?.name || '未知',
                    school: s.assignedMember?.currentSchool || '鐵衣',
                    rolesList: Array.isArray(s.roles) ? [...s.roles] : [],
                    jueji: typeof s.jueji === 'string' ? s.jueji : '',
                    qunxia: typeof s.qunxia === 'string' ? s.qunxia : '',
                    zhuangbei: typeof s.zhuangbei === 'string' ? s.zhuangbei : ''
                  }))
                })
              }
            }
          })
        }
      })
    }
    batchMemberGroups.value = groups
    selectedBatchMembers.value = []
    activeBatchDropdown.value = null
    showBatchEditModal.value = true
    showOtherOpsDropdown.value = false
  } catch (err) {
    alert("批量編輯資料載入失敗，請稍後重試。")
  }
}

const toggleGroupBatchSelect = (group, event) => {
  if (!group || !Array.isArray(group.members)) return
  const isChecked = event.target.checked
  group.members.forEach(m => {
    const idx = selectedBatchMembers.value.indexOf(m.slotId)
    if (isChecked && idx === -1) selectedBatchMembers.value.push(m.slotId)
    else if (!isChecked && idx > -1) selectedBatchMembers.value.splice(idx, 1)
  })
}

const openBatchRoleSelectModal = () => {
  if (selectedBatchMembers.value.length === 0) return alert('請先勾選要批量修改的成員！')
  tempBatchRolePills.value = ['保鑣']
  showBatchRoleDialog.value = true
}

const toggleTempBatchRolePill = (r) => {
  const idx = tempBatchRolePills.value.indexOf(r)
  if (idx > -1) tempBatchRolePills.value.splice(idx, 1)
  else tempBatchRolePills.value.push(r)
}

const applyBatchRoleSelection = () => {
  batchMemberGroups.value.forEach(g => {
    if (g && Array.isArray(g.members)) {
      g.members.forEach(m => {
        if (selectedBatchMembers.value.includes(m.slotId)) {
          m.rolesList = [...tempBatchRolePills.value]
        }
      })
    }
  })
  showBatchRoleDialog.value = false
}

const openBatchJuejiSelectModal = () => {
  if (selectedBatchMembers.value.length === 0) return alert('請先勾選要批量修改的成員！')
  tempBatchJuejiVal.value = '太極圖'
  showBatchJuejiDialog.value = true
}

const applyBatchJuejiSelection = () => {
  batchMemberGroups.value.forEach(g => {
    if (g && Array.isArray(g.members)) {
      g.members.forEach(m => {
        if (selectedBatchMembers.value.includes(m.slotId)) {
          m.jueji = tempBatchJuejiVal.value
        }
      })
    }
  })
  showBatchJuejiDialog.value = false
}

const openBatchQunxiaSelectModal = () => {
  if (selectedBatchMembers.value.length === 0) return alert('請先勾選要批量修改的成員！')
  tempBatchQunxiaVal.value = '咚咚跳台'
  showBatchQunxiaDialog.value = true
}

const isBatchQunxiaPillSelected = (q) => typeof tempBatchQunxiaVal.value === 'string' && tempBatchQunxiaVal.value.split(',').map(s => s.trim()).includes(q)
const toggleBatchQunxiaPill = (q) => {
  let list = (typeof tempBatchQunxiaVal.value === 'string' && tempBatchQunxiaVal.value) ? tempBatchQunxiaVal.value.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(q)
  if (idx > -1) list.splice(idx, 1)
  else list.push(q)
  tempBatchQunxiaVal.value = list.join(', ')
}

const applyBatchQunxiaSelection = () => {
  batchMemberGroups.value.forEach(g => {
    if (g && Array.isArray(g.members)) {
      g.members.forEach(m => {
        if (selectedBatchMembers.value.includes(m.slotId)) {
          m.qunxia = tempBatchQunxiaVal.value.trim()
        }
      })
    }
  })
  showBatchQunxiaDialog.value = false
}

const openBatchLiupaiSelectModal = () => {
  if (selectedBatchMembers.value.length === 0) return alert('請先勾選要批量修改的成員！')
  tempBatchLiupaiVal.value = '清泉'
  showBatchLiupaiDialog.value = true
}

const isBatchLiupaiPillSelected = (l) => typeof tempBatchLiupaiVal.value === 'string' && tempBatchLiupaiVal.value.split(',').map(s => s.trim()).includes(l)
const toggleBatchLiupaiPill = (l) => {
  let list = (typeof tempBatchLiupaiVal.value === 'string' && tempBatchLiupaiVal.value) ? tempBatchLiupaiVal.value.split(',').map(s => s.trim()).filter(Boolean) : []
  const idx = list.indexOf(l)
  if (idx > -1) list.splice(idx, 1)
  else list.push(l)
  tempBatchLiupaiVal.value = list.join(', ')
}

const applyBatchLiupaiSelection = () => {
  batchMemberGroups.value.forEach(g => {
    if (g && Array.isArray(g.members)) {
      g.members.forEach(m => {
        if (selectedBatchMembers.value.includes(m.slotId)) {
          m.zhuangbei = tempBatchLiupaiVal.value.trim()
        }
      })
    }
  })
  showBatchLiupaiDialog.value = false
}

const saveBatchEdit = () => {
  if (Array.isArray(batchMemberGroups.value)) {
    batchMemberGroups.value.forEach(g => {
      if (g && Array.isArray(g.members)) {
        g.members.forEach(m => {
          if (m && m.slotRef) {
            m.slotRef.roles = Array.isArray(m.rolesList) ? [...m.rolesList] : []
            m.slotRef.jueji = m.jueji || ''
            m.slotRef.qunxia = m.qunxia || ''
            m.slotRef.zhuangbei = m.zhuangbei || ''
          }
        })
      }
    })
  }
  showBatchEditModal.value = false
}

const confirmClearRoster = () => {
  showOtherOpsDropdown.value = false
  confirmTitle.value = '清空陣容'
  confirmMessage.value = '將清空本場全部排表，頁面會刷新；此操作不可撤銷。'
  showConfirmModal.value = true
}

const triggerConfirmModal = (title, message, onConfirm) => {
  confirmTitle.value = title
  confirmMessage.value = message
  confirmActionCallback = onConfirm
  showConfirmModal.value = true
}

const executeConfirmAction = () => {
  if (confirmActionCallback) {
    confirmActionCallback()
    confirmActionCallback = null
  } else {
    matrixTeams.value.forEach(team => {
      team.squads.forEach(squad => {
        squad.slots.forEach(slot => {
          if (slot.assignedMember) {
            slot.assignedMember.assigned = false
            slot.assignedMember = null
          }
        })
      })
    })
  }
  showConfirmModal.value = false
}

const templateOptions = [
  { id: 1, name: '甲組通用模板' },
  { id: 2, name: '乙組防守模板' }
]

const applyRosterTemplate = (tpl) => {
  appliedTemplateName.value = tpl.name
  showTemplateDropdown.value = false

  matrixTeams.value[0].squads[0].slots.forEach((s, idx) => {
    if (idx === 0) s.templateConfig.roles = ['拆塔指揮', '保鑣指揮']
    if (idx === 1) s.templateConfig.roles = ['保鑣', '埋頭猛拆']
  })
}

const formatArrayText = (arr) => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '—'
  return arr.join('、')
}

onMounted(fetchRosterDataFromDB)
</script>

<style scoped>
.roster-board-layout { display: flex; flex-direction: column; min-height: calc(100vh - 60px); background: #f4f6f9; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }

/* 頂部 Header */
.roster-header-bar { display: flex; justify-content: space-between; align-items: center; padding: 12px 20px; background: #ffffff; border-bottom: 1px solid #e2e8f0; }
.header-left-info { display: flex; align-items: center; gap: 12px; }
.btn-back-link { background: none; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #475569; }
.league-title-tag { font-size: 16px; font-weight: bold; color: #1e293b; }
.league-type-tag { background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; }
.league-time-text { font-size: 12px; color: #64748b; }
.btn-export { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }

/* 主要內容容器 */
.roster-main-container { flex: 1; display: flex; gap: 16px; padding: 16px 20px; overflow: hidden; }

/* 右側內容區 */
.matrix-content-area { flex: 1; display: flex; flex-direction: column; gap: 12px; overflow-x: auto; }
.matrix-toolbar { display: flex; justify-content: space-between; align-items: center; background: #ffffff; padding: 10px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
.toolbar-left, .toolbar-right { display: flex; align-items: center; gap: 10px; }
.toolbar-section-title { font-size: 14px; font-weight: bold; color: #1e293b; }

.inline-switch-group { display: flex; align-items: center; gap: 6px; }
.switch-label-text { font-size: 12px; color: #475569; font-weight: bold; }

.switch-sm { position: relative; display: inline-block; width: 30px; height: 16px; }
.switch-sm input { opacity: 0; width: 0; height: 0; }
.slider-sm { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .3s; border-radius: 16px; }
.slider-sm:before { position: absolute; content: ""; height: 12px; width: 12px; left: 2px; bottom: 2px; background-color: white; transition: .3s; border-radius: 50%; }
input:checked + .slider-sm { background-color: #3b82f6; }
input:checked + .slider-sm:before { transform: translateX(14px); }

.layout-switch-btn-group { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: white; }
.layout-icon-btn { border: none; background: white; padding: 4px 10px; font-size: 15px; color: #64748b; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
.layout-icon-btn.active { background: #3b82f6; color: white; }

.btn-secondary-sm { background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #334155; }
.btn-primary-sm { background: #3b82f6; color: white; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.template-select-label { font-size: 12px; color: #64748b; font-weight: bold; }

.custom-select-wrapper { position: relative; width: 160px; }
.custom-select-input { display: flex; align-items: center; justify-content: space-between; padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; }
.custom-select-dropdown { position: absolute; top: 100%; right: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; }
.dropdown-item { padding: 8px 12px; font-size: 12px; cursor: pointer; }
.dropdown-item:hover { background: #f1f5f9; }

/* 上陣職業數量統計欄 */
.onboard-stats-bar { display: flex; align-items: center; gap: 12px; background: #ffffff; padding: 8px 16px; border-radius: 8px; border: 1px solid #e2e8f0; }
.stats-bar-title { font-size: 12px; font-weight: bold; color: #475569; }
.stats-icons-list { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
.stats-icon-item { display: flex; align-items: center; gap: 4px; }
.stats-school-img { width: 18px; height: 18px; object-fit: contain; }
.stats-count-badge { font-size: 12px; font-weight: bold; color: #94a3b8; }
.stats-count-badge.active { color: #2563eb; }

/* 導出圖片預覽 Modal 樣式 */
.full-screen-overlay {
  z-index: 200;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
}
.export-modal-container {
  width: 95vw;
  height: 92vh;
  background: #f8fafc;
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.2);
}
.export-modal-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e2e8f0;
}
.export-modal-title {
  font-size: 16px;
  font-weight: bold;
  color: #1e293b;
}

.export-modal-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.export-sidebar-controls.simple-sidebar {
  width: 260px;
  background: #ffffff;
  border-right: 1px solid #e2e8f0;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}
.sidebar-info-card {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  padding: 12px;
  border-radius: 8px;
}
.sidebar-card-title {
  margin: 0 0 6px 0;
  font-size: 13px;
  color: #1e293b;
}
.sidebar-card-desc {
  margin: 0;
  font-size: 11px;
  color: #64748b;
  line-height: 1.4;
}

.export-control-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.export-section-title {
  font-size: 13px;
  font-weight: bold;
  color: #1e293b;
  border-bottom: 1px solid #e2e8f0;
  padding-bottom: 6px;
}
.control-switch-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: #334155;
  font-weight: 500;
}
.team-switch-label {
  display: flex;
  align-items: center;
  gap: 6px;
}
.team-color-dot-sm {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
}

.export-actions-bottom {
  display: flex;
  flex-direction: column;
  margin-top: auto;
}
.btn-lg {
  padding: 12px;
  font-size: 14px;
  font-weight: bold;
}
.margin-r {
  margin-right: 6px;
}

.export-preview-stage {
  flex: 1;
  background: #e2e8f0;
  padding: 24px;
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
}
.preview-canvas-paper {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
  min-width: 800px;
  max-width: 1200px;
  width: 100%;
}

/* 下拉選單組件 */
.custom-dropdown-container { position: relative; flex: 1; display: flex; align-items: center; }
.dropdown-toggle-btn { position: absolute; right: 4px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px 6px; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.dropdown-toggle-btn i { transition: transform 0.2s; }
.dropdown-toggle-btn i.rotate { transform: rotate(180deg); }

.skill-dropdown-panel { position: absolute; top: 100%; left: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 160px; overflow-y: auto; z-index: 120; padding: 4px 0; }

/* 編輯團隊 Modal */
.modal-title-with-sub { display: flex; align-items: baseline; gap: 8px; }
.modal-sub-desc { font-size: 12px; color: #94a3b8; font-weight: normal; }

.team-tab-pills-row { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.team-tab-pill { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; color: #475569; display: flex; align-items: center; }
.team-tab-pill.active { background: #eff6ff; color: #2563eb; border-color: #3b82f6; font-weight: bold; }

.squad-title-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.add-squad-link-btn { background: none; border: none; color: #3b82f6; font-weight: bold; font-size: 12px; cursor: pointer; }

.team-squads-table-wrapper { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
.edit-squads-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.edit-squads-table th, .edit-squads-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: left; }
.edit-squads-table th { background: #f8fafc; color: #64748b; font-weight: 600; }
.table-input { width: 100%; padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; box-sizing: border-box; outline: none; }
.table-select { padding: 4px 8px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; outline: none; }

.empty-cell-sm { text-align: center; color: #94a3b8; padding: 15px; }

/* Modal 通用 */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.3); display: flex; justify-content: center; align-items: center; z-index: 100; }
.modal-card { background: white; border-radius: 12px; padding: 20px; color: #333; }
.slot-info-modal { width: 500px; max-height: 85vh; overflow-y: auto; }
.slot-modal-card { width: 520px; max-height: 85vh; overflow-y: auto; }
.large-card { width: 680px; max-height: 85vh; overflow-y: auto; }
.wide-card { width: 840px; max-height: 85vh; overflow-y: auto; }
.wide-swap-card { width: 440px; }

.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; }
.modal-header-actions { display: flex; align-items: center; }
.close-btn { cursor: pointer; font-size: 20px; color: #94a3b8; }

.slot-member-profile-card { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; }
.profile-school-img { width: 32px; height: 32px; object-fit: contain; }
.profile-name { font-size: 15px; font-weight: bold; color: #1e293b; }
.profile-school-tag { background: #eff6ff; color: #2563eb; padding: 2px 6px; border-radius: 4px; font-size: 11px; margin-left: 8px; }

.info-details-box { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: #64748b; }
.info-label { font-weight: bold; width: 80px; display: inline-block; }

.slot-location-tag { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 6px 12px; border-radius: 6px; font-size: 12px; font-weight: bold; margin-bottom: 15px; }

.form-block { display: flex; flex-direction: column; gap: 8px; }
.block-title { font-size: 13px; font-weight: bold; color: #1e293b; }
.role-pills-grid, .role-tag-grid { display: flex; flex-wrap: wrap; gap: 6px; }
.role-pill-btn, .role-tag-btn { border: 1px solid #cbd5e1; background: white; padding: 4px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; color: #475569; }
.role-pill-btn.active, .role-tag-btn.active { background: #3b82f6; color: white; border-color: #3b82f6; font-weight: bold; }

.school-pills-group { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; }
.school-btn-card { border: 1px solid #cbd5e1; background: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all 0.2s; }
.school-btn-card.active { border-color: var(--badge-color); background: var(--badge-bg); color: var(--badge-color); font-weight: bold; }
.btn-img-icon { width: 18px; height: 18px; object-fit: contain; }

.skill-input-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
.skill-input-row label { width: 80px; font-weight: bold; }
.skill-field, .input-field, .select-field { padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; }
.skill-textarea { width: 100%; height: 80px; padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; resize: none; box-sizing: border-box; outline: none; }

.form-section-title { font-weight: bold; font-size: 14px; border-left: 3px solid #3b82f6; padding-left: 8px; margin-bottom: 15px; }
.form-row { display: flex; align-items: center; margin-bottom: 12px; font-size: 13px; }
.form-row.align-start { align-items: flex-start; }
.form-row label { width: 100px; font-weight: bold; }
.req { color: #ef4444; }

.school-selector { display: flex; flex-wrap: wrap; gap: 8px; flex: 1; align-items: center; }

.input-with-counter { position: relative; flex: 1; display: flex; align-items: center; }
.counter-input { width: 100%; padding: 6px 60px 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; }
.input-char-counter { position: absolute; right: 10px; font-size: 11px; color: #94a3b8; pointer-events: none; }

/* 批量編輯 Modal */
.batch-modal-card { max-height: 85vh; overflow-y: auto; }
.batch-toolbar-top { display: flex; align-items: center; font-size: 13px; font-weight: bold; flex-wrap: wrap; gap: 8px; }
.batch-table-container { display: flex; flex-direction: column; gap: 16px; overflow: visible; }
.batch-group-block { border: 1px solid #e2e8f0; border-radius: 6px; overflow: visible; }
.batch-group-title { background: #f8fafc; padding: 8px 12px; font-size: 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; }
.batch-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.batch-table th, .batch-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: left; position: relative; }
.batch-table th { background: #ffffff; color: #64748b; font-weight: 600; }
.table-inline-input { width: 100%; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; box-sizing: border-box; outline: none; background: white; }
.batch-roles-display { border: 1px solid #cbd5e1; background: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; min-height: 20px; color: #334155; cursor: pointer; display: flex; align-items: center; justify-content: space-between; }

.team-color-picker-flex { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.color-clear-btn { border: 1px solid #cbd5e1; background: white; padding: 3px 10px; border-radius: 12px; font-size: 12px; cursor: pointer; color: #64748b; }
.color-clear-btn.active { border-color: #3b82f6; color: #2563eb; font-weight: bold; background: #eff6ff; }
.color-dot-btn { width: 22px; height: 22px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: transform 0.15s; }
.color-dot-btn:hover { transform: scale(1.15); }
.color-dot-btn.active { border-color: #1e293b; box-shadow: 0 0 0 2px white inset; }
.check-white { font-size: 14px; color: white; }

.full-w { width: 100%; }
.text-truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }

/* 交換團隊 Modal */
.swap-checkbox-list { display: flex; flex-direction: column; gap: 10px; padding: 10px 0; }
.checkbox-label { display: flex; align-items: center; gap: 8px; font-size: 13px; cursor: pointer; color: #334155; }

/* 置中刪除確認 Modal */
.confirm-modal-card { width: 380px; text-align: center; padding: 24px; }
.confirm-modal-body { display: flex; flex-direction: column; align-items: center; gap: 12px; }
.warning-icon-wrapper { width: 48px; height: 48px; border-radius: 50%; background: #fef3c7; display: flex; align-items: center; justify-content: center; }
.warning-icon { font-size: 28px; color: #d97706; }
.confirm-title { margin: 0; font-size: 16px; color: #1e293b; }
.confirm-msg { margin: 0; font-size: 13px; color: #64748b; line-height: 1.5; }

.modal-footer.space-between, .confirm-modal-footer.space-between { display: flex; justify-content: flex-end; gap: 16px; margin-top: 20px; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 18px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-primary.btn-red { background: #ef4444; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 18px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-link { background: none; border: none; color: #3b82f6; cursor: pointer; font-size: 12px; padding: 0; }
.text-red { color: #ef4444; }
.text-left { text-align: left; }
.font-bold { font-weight: bold; }
.text-center { text-align: center; }
.flex-1 { flex: 1; }
.margin-l { margin-left: 10px; }
.margin-b { margin-bottom: 10px; }
.margin-t { margin-top: 12px; }
</style>