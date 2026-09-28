<template>
  <div class="roster-board-layout" @click="closeAllSkillDropdowns">
    <!-- 頂部頁籤與資訊 -->
    <div class="roster-header-bar">
      <div class="header-left-info">
        <button class="btn-back-link" @click="$emit('back')">&lt; 返回聯賽列表</button>
        <span class="league-title-tag">{{ leagueInfo.title }}</span>
        <span class="league-type-tag">{{ leagueInfo.type }}</span>
        <span class="league-time-text">{{ leagueInfo.startTime }}</span>
      </div>

      <div class="header-right-actions">
        <button class="btn-export">導出圖片 <i class="mdi mdi-chevron-down"></i></button>
      </div>
    </div>

    <div class="roster-main-container">
      
      <!-- ================= 左側：待選成員區塊 ================= -->
      <aside class="pending-sidebar">
        <div class="guild-select-box">
          <span class="guild-name-display">{{ leagueInfo.guild || '百錵谷酒池肉林' }}</span>
        </div>

        <div class="pending-filter-bar">
          <div class="pending-title-group">
            <div class="title-left-box">
              <span class="pending-title">待選成員</span>
              <button class="btn-icon-add" @click="openAddMemberModal" title="新增成員">+</button>
            </div>

            <div class="pending-mode-toggle">
              <button 
                :class="['mode-pill-btn', { active: pendingViewMode === 'school' }]" 
                @click="pendingViewMode = 'school'"
              >
                流派
              </button>
              <button 
                :class="['mode-pill-btn', { active: pendingViewMode === 'all' }]" 
                @click="pendingViewMode = 'all'"
              >
                全員
              </button>
            </div>
          </div>

          <input 
            type="text" 
            v-model="searchMemberQuery" 
            placeholder="輸入名字查詢成員" 
            class="pending-search-input" 
          />
        </div>

        <!-- 流派 Icon 快篩列 -->
        <div class="school-icon-filter-row">
          <div 
            v-for="s in availableSchools" 
            :key="s.name"
            :class="['icon-filter-item', { active: activeSchoolFilter === s.name }]"
            @click="toggleSchoolFilter(s.name)"
            :title="s.name"
          >
            <img :src="getSchoolImg(s.file)" class="school-filter-img" />
          </div>
        </div>

        <!-- 1. 按流派分類的手風琴列表 -->
        <div v-if="pendingViewMode === 'school'" class="school-accordion-list">
          <div 
            v-for="s in filteredSchoolAccordion" 
            :key="s.name" 
            class="accordion-item"
          >
            <div class="accordion-head" @click="toggleAccordion(s.name)">
              <div class="accordion-head-left">
                <img :src="getSchoolImg(s.file)" class="accordion-school-img" />
                <span class="accordion-school-name">{{ s.name }}</span>
                <span class="accordion-count">({{ getUnassignedCountBySchool(s.name) }})</span>
              </div>
              <i :class="['mdi', expandedSchools.includes(s.name) ? 'mdi-chevron-down' : 'mdi-chevron-right', 'accordion-arrow']"></i>
            </div>

            <div v-if="expandedSchools.includes(s.name)" class="accordion-body">
              <div 
                v-for="m in getUnassignedMembersBySchool(s.name)" 
                :key="m.id + '_' + s.name"
                class="member-drag-card"
                draggable="true"
                @dragstart="onDragStartPendingMember(m)"
                @click="openFullMemberEditModal(m)"
                title="按住拖拽至排表，或點擊編輯成員資料"
              >
                <div class="drag-card-icons-group">
                  <img :src="getSchoolImgByName(m.currentSchool)" class="drag-card-icon" />
                  <img 
                    v-if="getSecondarySchool(m)" 
                    :src="getSchoolImgByName(getSecondarySchool(m))" 
                    class="drag-card-icon-sub" 
                    title="副職業"
                  />
                </div>
                <span class="drag-card-name">{{ m.name }}</span>
              </div>

              <div v-if="getUnassignedMembersBySchool(s.name).length === 0" class="empty-sub-text">
                無待選成員
              </div>
            </div>
          </div>
        </div>

        <!-- 2. 一整排向下的全員清單 -->
        <div v-else-if="pendingViewMode === 'all'" class="all-members-flow-list">
          <div 
            v-for="m in allUnassignedMembersList" 
            :key="m.id"
            class="member-drag-card"
            draggable="true"
            @dragstart="onDragStartPendingMember(m)"
            @click="openFullMemberEditModal(m)"
            title="按住拖拽至排表，或點擊編輯成員資料"
          >
            <div class="drag-card-icons-group">
              <img :src="getSchoolImgByName(m.currentSchool)" class="drag-card-icon" />
              <img 
                v-if="getSecondarySchool(m)" 
                :src="getSchoolImgByName(getSecondarySchool(m))" 
                class="drag-card-icon-sub" 
                title="副職業"
              />
            </div>
            <span class="drag-card-name">{{ m.name }}</span>
          </div>

          <div v-if="allUnassignedMembersList.length === 0" class="empty-sub-text">
            無符合條件之待選成員
          </div>
        </div>

      </aside>

      <!-- ================= 右側：團隊矩陣排表區塊 ================= -->
      <main class="matrix-content-area">
        <!-- 團隊工具列 -->
        <div class="matrix-toolbar">
          <div class="toolbar-left">
            <span class="toolbar-section-title">團隊配置</span>
            <button class="btn-secondary-sm margin-l" @click="saveRosterBoard">保存陣容</button>
            <button class="btn-primary-sm margin-l" @click="addTeam">+ 添加團隊</button>
            <button class="btn-secondary-sm margin-l" @click="openBatchEditModal">批量編輯</button>

            <!-- 顯示副職獨立開關 -->
            <div class="inline-switch-group margin-l">
              <span class="switch-label-text">顯示副職</span>
              <label class="switch-sm">
                <input type="checkbox" v-model="showSecondarySchool" />
                <span class="slider-sm"></span>
              </label>
            </div>

            <button class="btn-link text-red margin-l font-bold" @click="confirmClearRoster">清空陣容</button>
          </div>

          <!-- 選擇陣容模板下拉 -->
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
          </div>
        </div>

        <!-- 團隊矩陣 (支援整隊拖拽與交換 - 圖一/圖二) -->
        <div class="teams-matrix-wrapper">
          <div v-for="(team, tIdx) in matrixTeams" :key="team.id" class="team-matrix-row">
            
            <!-- 團隊標頭列 -->
            <div class="team-header-row">
              <div class="team-title-edit-group" @click="openEditTeamModal(tIdx)" title="編輯團隊名稱與小隊職能">
                <span class="team-row-title">{{ team.name }}</span>
                <span v-if="team.desc" class="team-row-desc">- {{ team.desc }}</span>
                <i class="mdi mdi-pencil-outline team-pencil-icon"></i>
              </div>
              <button 
                v-if="team.squads.length < 5" 
                class="add-squad-btn" 
                @click="addSquadToTeam(team)"
              >
                + 添加小隊
              </button>
            </div>

            <!-- 小隊網格 (小隊標頭支援整隊拖拽 - 圖一/圖二) -->
            <div class="squads-matrix-grid">
              <div 
                v-for="(squad, sIdx) in team.squads" 
                :key="squad.id" 
                class="squad-column-box"
                @dragover.prevent
                @drop="onDropOnSquadColumn(team, squad)"
              >
                <!-- 小隊標頭：可拖拽小隊 -->
                <div 
                  class="squad-column-head draggable-head" 
                  draggable="true"
                  @dragstart="onDragStartSquad(team, squad)"
                  title="按住可拖拽移動/交換整隊位置"
                >
                  <div class="squad-head-title">
                    <i class="mdi mdi-drag-vertical drag-handle-icon"></i>
                    {{ squad.name }} <template v-if="squad.zhineng">- {{ squad.zhineng }}</template>
                  </div>
                  <div v-if="squad.desc" class="squad-head-desc">{{ squad.desc }}</div>
                </div>

                <div class="slots-vertical-list">
                  <div 
                    v-for="(slot, slotIdx) in squad.slots" 
                    :key="slot.id"
                    :class="[
                      'matrix-slot-card', 
                      { 
                        'has-member': slot.assignedMember, 
                        'template-guideline': !slot.assignedMember && getSlotGuidelineText(slot) 
                      }
                    ]"
                    :style="getSlotStyle(slot)"
                    :draggable="!!slot.assignedMember"
                    @dragstart="onDragStartSlot(team, squad, slot)"
                    @dragover.prevent
                    @drop="onDropOnSlot(team, squad, slot)"
                    @click="clickSlot(team, squad, slot, slotIdx)"
                  >
                    <!-- 1. 格子已放置成員 (支援拖拽) -->
                    <template v-if="slot.assignedMember">
                      <div class="assigned-slot-content">
                        <div class="member-head-info">
                          <img :src="getSchoolImgByName(slot.assignedMember.currentSchool)" class="slot-school-icon" />
                          <img 
                            v-if="showSecondarySchool && getSecondarySchool(slot.assignedMember)" 
                            :src="getSchoolImgByName(getSecondarySchool(slot.assignedMember))" 
                            class="slot-school-icon-sub" 
                            title="副職業"
                          />
                          <span class="slot-member-name">{{ slot.assignedMember.name }}</span>
                        </div>
                        <span class="slot-roles-text">{{ getSlotRoleSummary(slot) }}</span>
                      </div>
                    </template>

                    <!-- 2. 無人時顯示格子席位配置 -->
                    <template v-else-if="getSlotGuidelineText(slot)">
                      <div class="template-guideline-content">
                        <span class="guideline-role-text">{{ getSlotGuidelineText(slot) }}</span>
                      </div>
                    </template>

                    <!-- 3. 完全空白席位 -->
                    <template v-else>
                      <div class="empty-slot-placeholder">點擊配置席位</div>
                    </template>

                    <span v-if="slot.assignedMember" class="slot-clear-x" @click.stop="removeMemberFromSlot(slot)" title="移除席位">&times;</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>

    <!-- ================= 彈窗組件 ================= -->

    <!-- 1. 圖三對應：交換兩隊位置 Modal -->
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
        <div class="confirm-modal-footer">
          <button class="btn-secondary" @click="showSwapSquadModal = false">取消</button>
          <button class="btn-primary" @click="executeSwapSquad">確定</button>
        </div>
      </div>
    </div>

    <!-- 2. 圖五對應：美化批量編輯 Modal (各職業專屬背景底色、勾選一鍵統一變更) -->
    <div v-if="showBatchEditModal" class="modal-overlay" @click.self="showBatchEditModal = false">
      <div class="modal-card wide-card batch-modal-card">
        <div class="modal-header">
          <h3>批量編輯成員職能與配裝</h3>
          <span class="close-btn" @click="showBatchEditModal = false">&times;</span>
        </div>
        <div class="modal-body">
          <!-- 頂部一鍵配置按鈕工具列 (圖五對應) -->
          <div class="batch-toolbar-top">
            <span>已選 {{ selectedBatchMembers.length }} 人</span>
            <button class="btn-secondary-sm margin-l" @click="selectedBatchMembers = []">清空選擇</button>

            <button class="btn-primary-sm margin-l" @click="batchApplyRole">配置職能</button>
            <button class="btn-primary-sm margin-l" @click="batchApplyJueji">配置絕技</button>
            <button class="btn-primary-sm margin-l" @click="batchApplyQunxia">配置群俠百家</button>
            <button class="btn-primary-sm margin-l" @click="batchApplyLiupai">配置流派技能</button>
          </div>

          <!-- 表格清單 (背景色隨第一主職業改變 - 圖五) -->
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
                    <th width="100">成員</th>
                    <th width="80">流派</th>
                    <th>職能</th>
                    <th>絕技</th>
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
                      <select v-model="m.roles" class="table-inline-select">
                        <option value="">請選擇職能</option>
                        <option v-for="r in personalRoleOptions" :key="r" :value="r">{{ r }}</option>
                      </select>
                    </td>
                    <td><input type="text" v-model="m.jueji" placeholder="輸入或選擇，最長20字" class="table-inline-input" /></td>
                    <td><input type="text" v-model="m.qunxia" placeholder="輸入或選擇，最長20字" class="table-inline-input" /></td>
                    <td><input type="text" v-model="m.zhuangbei" placeholder="輸入或選擇，最長20字" class="table-inline-input" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" @click="showBatchEditModal = false">取消</button>
          <button class="btn-primary" @click="saveBatchEdit">保存</button>
        </div>
      </div>
    </div>

    <!-- 3. 編輯團隊 Modal -->
    <div v-if="showEditTeamModal" class="modal-overlay" @click.self="showEditTeamModal = false">
      <div class="modal-card wide-card">
        <div class="modal-header">
          <div class="modal-title-with-sub">
            <h3>編輯團隊</h3>
            <span class="modal-sub-desc">團隊名稱、備註與小隊職能維護</span>
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

        <div class="modal-footer">
          <button class="btn-secondary" @click="showEditTeamModal = false">取消</button>
          <button class="btn-primary" @click="showEditTeamModal = false">確定</button>
        </div>
      </div>
    </div>

    <!-- 4. 格子有人時：排表信息 Modal -->
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

          <!-- 聯賽職能 -->
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

          <!-- 配裝信息 (流派技能) -->
          <div class="form-block margin-t">
            <div class="block-title">◆ 配裝信息</div>
            
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
                  <div v-for="q in qunxiaOptions" :key="q" class="dropdown-item" @mousedown.prevent.stop="tempSlotQunxia = q; activeSkillDropdown = null">
                    {{ q }}
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
                  <div v-for="l in liupaiSkillOptions" :key="l" class="dropdown-item" @mousedown.prevent.stop="tempSlotZhuangbei = l; activeSkillDropdown = null">
                    {{ l }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-secondary" @click="showSlotInfoModal = false">取消</button>
          <button class="btn-primary" @click="saveSlotInfo">保存</button>
        </div>
      </div>
    </div>

    <!-- 5. 格子沒人時：席位配置 Modal -->
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
              <div class="custom-dropdown-container">
                <input type="text" v-model="tempConfigQunxia" placeholder="輸入或選擇群俠百家" class="skill-field flex-1" />
                <button type="button" class="dropdown-toggle-btn" @click.stop="toggleSkillDropdown('qunxia_cfg')">
                  <i :class="['mdi', 'mdi-chevron-down', { rotate: activeSkillDropdown === 'qunxia_cfg' }]"></i>
                </button>
                <div v-if="activeSkillDropdown === 'qunxia_cfg'" class="skill-dropdown-panel" @click.stop>
                  <div v-for="q in qunxiaOptions" :key="q" class="dropdown-item" @mousedown.prevent.stop="tempConfigQunxia = q; activeSkillDropdown = null">
                    {{ q }}
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
                  <div v-for="l in liupaiSkillOptions" :key="l" class="dropdown-item" @mousedown.prevent.stop="tempConfigZhuangbei = l; activeSkillDropdown = null">
                    {{ l }}
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

        <div class="modal-footer">
          <button class="btn-secondary" @click="showSlotConfigModal = false">取消</button>
          <button class="btn-primary" @click="saveSlotConfig">確定</button>
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
              <select v-model="memberEditForm.guild" class="flex-1 select-field">
                <option value="百錵谷酒池肉林">百錵谷酒池肉林</option>
                <option value="未分配">未分配</option>
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

        <div class="modal-footer">
          <button class="btn-secondary" @click="showMemberEditModal = false">取消</button>
          <button class="btn-primary" @click="saveFullMemberEdit">提交</button>
        </div>
      </div>
    </div>

    <!-- 7. 點擊待選成員「+」：新增成員 Modal -->
    <div v-if="showAddMemberModal" class="modal-overlay" @click.self="showAddMemberModal = false">
      <div class="modal-card large-card">
        <div class="modal-header">
          <h3>新增成員</h3>
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
                <option value="百錵谷酒池肉林">百錵谷酒池肉林</option>
                <option value="未分配">未分配</option>
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

        <div class="modal-footer">
          <button class="btn-secondary" @click="showAddMemberModal = false">取消</button>
          <button class="btn-primary" @click="saveNewMember">提交</button>
        </div>
      </div>
    </div>

    <!-- 8. 置中刪除/清空確認 Modal -->
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
          <button class="btn-primary btn-red" @click="executeConfirmAction">確定清空</button>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  leagueItem: {
    type: Object,
    default: () => ({
      title: '幫會聯賽',
      type: '幫會聯賽',
      startTime: '2026-10-10 20:00',
      guild: '百錵谷酒池肉林'
    })
  }
})

defineEmits(['back'])

const leagueInfo = computed(() => props.leagueItem)

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

const getSchoolImg = (fileName) => {
  if (!fileName) return ''
  return new URL(`../../assets/schools/${fileName}.png`, import.meta.url).href
}

const getSchoolImgByName = (schoolName) => {
  const found = availableSchools.find(s => s.name === schoolName)
  return found ? getSchoolImg(found.file) : ''
}

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
  '滄瀾': '#e0e7ff'
}

const personalRoleOptions = [
  'D潮拆塔', '保鏢拆', '埋頭猛拆', '塔仇主T', '增益絕', '奶絕', '指揮',
  '清泉人傷', '清泉保活', '灌大團', '點殺', '燒屍體', '破甲人傷',
  '純保鏢', '統戰', '騰龍保鏢', '騰龍合軸'
]

const squadRoleOptions = [
  '保鏢隊', '雙碎隊', '雙神隊', '塔前隊', '塔後隊', '請假隊', '輪空隊'
]

const juejiOptions = ['狂發一怒', '太極圖']
const qunxiaOptions = ['咚咚跳台', '雲影濁香']
const liupaiSkillOptions = ['約定', '清泉']

const activeSkillDropdown = ref(null)

const toggleSkillDropdown = (type) => {
  if (activeSkillDropdown.value === type) activeSkillDropdown.value = null
  else activeSkillDropdown.value = type
}

const closeAllSkillDropdowns = () => {
  activeSkillDropdown.value = null
  showOtherOpsDropdown.value = false
  showTemplateDropdown.value = false
}

const showSecondarySchool = ref(false)
const pendingViewMode = ref('school')

const allMembers = ref([
  { id: 1, name: '行優', formerNames: [], schools: ['鐵衣', '龍吟'], currentSchool: '鐵衣', hasGodlyWeapon: false, guild: '百錵谷酒池肉林', status: '學徒', contact: '行優#1234', notes: '主力坦克', tether: '錵小錵', rolePreference: ['D潮拆塔', '保鏢拆'], rolePrefList: ['D潮拆塔', '保鏢拆'], assigned: false },
  { id: 2, name: '錵小錵', formerNames: [], schools: ['九靈', '碎夢'], currentSchool: '九靈', hasGodlyWeapon: true, guild: '百錵谷酒池肉林', status: '幫眾', contact: '', notes: '', tether: '行優', rolePreference: ['灌大團'], rolePrefList: ['灌大團'], assigned: false },
  { id: 3, name: '章小燒', formerNames: [], schools: ['血河', '鐵衣'], currentSchool: '血河', hasGodlyWeapon: false, guild: '百錵谷酒池肉林', status: '幫眾', contact: '', notes: '', tether: '', rolePreference: ['點殺'], rolePrefList: ['點殺'], assigned: false },
  { id: 4, name: '夜小夜', formerNames: [], schools: ['素問', '玄機'], currentSchool: '素問', hasGodlyWeapon: false, guild: '百錵谷酒池肉林', status: '幫眾', contact: '', notes: '', tether: '', rolePreference: ['奶絕', '清泉保活'], rolePrefList: ['奶絕', '清泉保活'], assigned: false }
])

const getSecondarySchool = (member) => {
  if (!member || !member.schools || member.schools.length < 2) return ''
  return member.schools.find(s => s !== member.currentSchool) || ''
}

const searchMemberQuery = ref('')
const activeSchoolFilter = ref(null)
const expandedSchools = ref(['鐵衣', '血河', '九靈', '素問', '潮光', '龍吟'])

const toggleSchoolFilter = (sName) => {
  activeSchoolFilter.value = activeSchoolFilter.value === sName ? null : sName
}

const toggleAccordion = (sName) => {
  const idx = expandedSchools.value.indexOf(sName)
  if (idx > -1) expandedSchools.value.splice(idx, 1)
  else expandedSchools.value.push(sName)
}

const filteredSchoolAccordion = computed(() => {
  if (activeSchoolFilter.value) {
    return availableSchools.filter(s => s.name === activeSchoolFilter.value)
  }
  return availableSchools
})

const getUnassignedMembersBySchool = (schoolName) => {
  const targetGuild = leagueInfo.value.guild || '百錵谷酒池肉林'
  return allMembers.value.filter(m => {
    const matchGuild = m.guild === targetGuild
    const notAssigned = !m.assigned
    const matchSearch = !searchMemberQuery.value || m.name.includes(searchMemberQuery.value.trim())

    let matchSchool = false
    if (showSecondarySchool.value) {
      matchSchool = m.schools ? m.schools.includes(schoolName) : (m.currentSchool === schoolName)
    } else {
      matchSchool = (m.currentSchool === schoolName)
    }

    return matchGuild && matchSchool && notAssigned && matchSearch
  })
}

const getUnassignedCountBySchool = (schoolName) => {
  return getUnassignedMembersBySchool(schoolName).length
}

const allUnassignedMembersList = computed(() => {
  const targetGuild = leagueInfo.value.guild || '百錵谷酒池肉林'
  return allMembers.value.filter(m => {
    const matchGuild = m.guild === targetGuild
    const notAssigned = !m.assigned
    const matchSearch = !searchMemberQuery.value || m.name.includes(searchMemberQuery.value.trim())

    let matchSchool = true
    if (activeSchoolFilter.value) {
      if (showSecondarySchool.value) {
        matchSchool = m.schools ? m.schools.includes(activeSchoolFilter.value) : (m.currentSchool === activeSchoolFilter.value)
      } else {
        matchSchool = (m.currentSchool === activeSchoolFilter.value)
      }
    }

    return matchGuild && notAssigned && matchSearch && matchSchool
  })
})

const showAddMemberModal = ref(false)
const showRoleDropdownInNewMember = ref(false)

const newMemberForm = ref({
  name: '',
  schools: ['鐵衣'],
  currentSchool: '鐵衣',
  hasGodlyWeapon: false,
  guild: '百錵谷酒池肉林',
  status: '幫眾',
  contact: '',
  notes: '',
  tether: '',
  rolePrefList: []
})

const openAddMemberModal = () => {
  newMemberForm.value = {
    name: '',
    schools: ['鐵衣'],
    currentSchool: '鐵衣',
    hasGodlyWeapon: false,
    guild: leagueInfo.value.guild || '百錵谷酒池肉林',
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
    if (newMemberForm.value.schools.length >= 2) {
      alert('最多只能選擇 2 個流派！')
      return
    }
    newMemberForm.value.schools.push(sName)
  }
}

const toggleRolePrefInNewMember = (rName) => {
  const idx = newMemberForm.value.rolePrefList.indexOf(rName)
  if (idx > -1) newMemberForm.value.rolePrefList.splice(idx, 1)
  else newMemberForm.value.rolePrefList.push(rName)
}

const saveNewMember = () => {
  if (!newMemberForm.value.name.trim()) return alert('請輸入角色名！')
  if (newMemberForm.value.schools.length === 0) return alert('請至少選擇一個流派！')

  const newObj = {
    id: Date.now(),
    name: newMemberForm.value.name.trim(),
    formerNames: [],
    schools: [...newMemberForm.value.schools],
    currentSchool: newMemberForm.value.currentSchool,
    hasGodlyWeapon: newMemberForm.value.hasGodlyWeapon,
    guild: newMemberForm.value.guild,
    status: newMemberForm.value.status,
    contact: newMemberForm.value.contact.trim(),
    notes: newMemberForm.value.notes.trim(),
    tether: newMemberForm.value.tether.trim(),
    rolePreference: [...newMemberForm.value.rolePrefList],
    rolePrefList: [...newMemberForm.value.rolePrefList],
    assigned: false
  }

  allMembers.value.push(newObj)
  showAddMemberModal.value = false
}

// 團隊盤面結構
const matrixTeams = ref([
  {
    id: 1,
    name: '進攻一團',
    desc: '我是團隊備註會顯示的地方',
    squads: [
      { id: 11, name: '一隊', zhineng: '塔後隊', desc: '我是顯示備註的地方', slots: createDefaultSlots() },
      { id: 12, name: '二隊', zhineng: '保鏢隊', desc: '', slots: createDefaultSlots() },
      { id: 13, name: '三隊', zhineng: '塔前隊', desc: '', slots: createDefaultSlots() },
      { id: 14, name: '四隊', zhineng: '', desc: '', slots: createDefaultSlots() },
      { id: 15, name: '五隊', zhineng: '', desc: '', slots: createDefaultSlots() }
    ]
  },
  {
    id: 2,
    name: '進攻二團',
    desc: '',
    squads: Array.from({ length: 5 }, (_, i) => ({
      id: 20 + i,
      name: `${i + 1}隊`,
      zhineng: '',
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
    jueji: '',
    qunxia: '',
    zhuangbei: '',
    templateConfig: {
      schools: [],
      roles: [],
      jueji: '',
      qunxia: '',
      zhuangbei: '',
      desc: ''
    }
  }))
}

const addTeam = () => {
  const num = matrixTeams.value.length + 1
  matrixTeams.value.push({
    id: Date.now(),
    name: `團隊 ${num}`,
    desc: '',
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
  if (team.squads.length >= 5) {
    alert('每個團隊最多只能創建 5 個小隊！')
    return
  }
  const squadNum = team.squads.length + 1
  team.squads.push({
    id: Date.now(),
    name: `${squadNum}隊`,
    zhineng: '',
    desc: '',
    slots: createDefaultSlots()
  })
}

// 拖拽狀態與交換兩隊 Modal (圖一 / 圖二 / 圖三)
let draggedType = null // 'pendingMember' | 'slotMember' | 'squad'
let draggedPendingMember = null
let draggedSlotRef = null
let draggedSquadRef = null
let targetSquadRef = null

const showSwapSquadModal = ref(false)
const swapOptions = ref({
  name: true,
  zhineng: true,
  desc: true,
  template: true
})

const onDragStartPendingMember = (member) => {
  draggedType = 'pendingMember'
  draggedPendingMember = member
}

const onDragStartSlot = (team, squad, slot) => {
  if (!slot.assignedMember) return
  draggedType = 'slotMember'
  draggedSlotRef = slot
}

const onDragStartSquad = (team, squad) => {
  draggedType = 'squad'
  draggedSquadRef = squad
}

const onDropOnSlot = (team, squad, targetSlot) => {
  if (draggedType === 'pendingMember' && draggedPendingMember) {
    if (targetSlot.assignedMember) {
      targetSlot.assignedMember.assigned = false
    }
    targetSlot.assignedMember = draggedPendingMember
    draggedPendingMember.assigned = true
    if (draggedPendingMember.rolePreference) {
      targetSlot.roles = [...draggedPendingMember.rolePreference]
    }
  } else if (draggedType === 'slotMember' && draggedSlotRef) {
    if (draggedSlotRef === targetSlot) return
    const tempMember = targetSlot.assignedMember
    const tempRoles = [...targetSlot.roles]
    const tempJueji = targetSlot.jueji
    const tempQunxia = targetSlot.qunxia
    const tempZhuangbei = targetSlot.zhuangbei

    targetSlot.assignedMember = draggedSlotRef.assignedMember
    targetSlot.roles = [...draggedSlotRef.roles]
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

const onDropOnSquadColumn = (team, targetSquad) => {
  if (draggedType === 'squad' && draggedSquadRef && draggedSquadRef !== targetSquad) {
    targetSquadRef = targetSquad
    showSwapSquadModal.value = true
  }
}

const executeSwapSquad = () => {
  if (draggedSquadRef && targetSquadRef) {
    // 交換 6 個席位內容 (包含已上位的成員與個別配置)
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

const showEditTeamModal = ref(false)
const activeEditTeamIndex = ref(0)

const openEditTeamModal = (idx) => {
  activeEditTeamIndex.value = idx
  showEditTeamModal.value = true
}

const currentEditingTeam = computed(() => {
  return matrixTeams.value[activeEditTeamIndex.value] || null
})

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

const getSlotStyle = (slot) => {
  if (slot.assignedMember) {
    const bg = schoolColorMap[slot.assignedMember.currentSchool] || '#eff6ff'
    return { backgroundColor: bg }
  }
  if (slot.templateConfig && slot.templateConfig.schools && slot.templateConfig.schools.length > 0) {
    const firstSchool = slot.templateConfig.schools[0]
    const bg = schoolColorMap[firstSchool] || '#fafafa'
    return { backgroundColor: bg }
  }
  return {}
}

const getSlotRoleSummary = (slot) => {
  if (slot.roles && slot.roles.length > 0) return slot.roles.join('、')
  return '點擊配置職能'
}

const getSlotGuidelineText = (slot) => {
  if (!slot.templateConfig) return ''
  const parts = []
  if (slot.templateConfig.roles && slot.templateConfig.roles.length > 0) {
    parts.push(slot.templateConfig.roles.join(' / '))
  }
  if (slot.templateConfig.schools && slot.templateConfig.schools.length > 0) {
    parts.push(slot.templateConfig.schools.join(' / '))
  }
  return parts.join(' - ')
}

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

const clickSlot = (team, squad, slot, slotIdx) => {
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

// 編輯成員 Modal
const showMemberEditModal = ref(false)
const showRoleDropdownInMemberEdit = ref(false)
const editingMemberRef = ref(null)

const memberEditForm = ref({
  name: '',
  schools: ['鐵衣'],
  currentSchool: '鐵衣',
  hasGodlyWeapon: false,
  guild: '百錵谷酒池肉林',
  status: '幫眾',
  contact: '',
  notes: '',
  tether: '',
  rolePrefList: []
})

const openFullMemberEditModal = (member) => {
  if (!member) return
  editingMemberRef.value = member
  memberEditForm.value = {
    name: member.name,
    schools: [...(member.schools || [member.currentSchool])],
    currentSchool: member.currentSchool,
    hasGodlyWeapon: member.hasGodlyWeapon || false,
    guild: member.guild || '百錵谷酒池肉林',
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
    if (memberEditForm.value.schools.length >= 2) {
      alert('最多只能選擇 2 個流派！')
      return
    }
    memberEditForm.value.schools.push(sName)
  }
}

const toggleRolePrefInMemberEdit = (rName) => {
  const idx = memberEditForm.value.rolePrefList.indexOf(rName)
  if (idx > -1) memberEditForm.value.rolePrefList.splice(idx, 1)
  else memberEditForm.value.rolePrefList.push(rName)
}

const saveFullMemberEdit = () => {
  if (!memberEditForm.value.name.trim()) return alert('請輸入角色名！')
  if (editingMemberRef.value) {
    editingMemberRef.value.name = memberEditForm.value.name.trim()
    editingMemberRef.value.schools = [...memberEditForm.value.schools]
    editingMemberRef.value.currentSchool = memberEditForm.value.currentSchool
    editingMemberRef.value.hasGodlyWeapon = memberEditForm.value.hasGodlyWeapon
    editingMemberRef.value.guild = memberEditForm.value.guild
    editingMemberRef.value.status = memberEditForm.value.status
    editingMemberRef.value.contact = memberEditForm.value.contact
    editingMemberRef.value.notes = memberEditForm.value.notes
    editingMemberRef.value.tether = memberEditForm.value.tether
    editingMemberRef.value.rolePreference = [...memberEditForm.value.rolePrefList]
    editingMemberRef.value.rolePrefList = [...memberEditForm.value.rolePrefList]
  }
  showMemberEditModal.value = false
}

// 批量編輯 Modal (圖五: 流派專屬背景底色 + 統一批量套用按鈕)
const showBatchEditModal = ref(false)
const selectedBatchMembers = ref([])
const batchMemberGroups = ref([])

const getRowSchoolBgStyle = (schoolName) => {
  const bg = schoolColorMap[schoolName] || '#ffffff'
  return { backgroundColor: bg }
}

const openBatchEditModal = () => {
  const groups = []
  matrixTeams.value.forEach(team => {
    team.squads.forEach(squad => {
      const assignedSlots = squad.slots.filter(s => s.assignedMember)
      if (assignedSlots.length > 0) {
        groups.push({
          title: `${team.name}--${squad.name}`,
          members: assignedSlots.map(s => ({
            slotId: s.id,
            slotRef: s,
            name: s.assignedMember.name,
            school: s.assignedMember.currentSchool,
            roles: s.roles.length > 0 ? s.roles[0] : '',
            jueji: s.jueji || '',
            qunxia: s.qunxia || '',
            zhuangbei: s.zhuangbei || ''
          }))
        })
      }
    })
  })
  batchMemberGroups.value = groups
  selectedBatchMembers.value = []
  showBatchEditModal.value = true
  showOtherOpsDropdown.value = false
}

const toggleGroupBatchSelect = (group, event) => {
  const isChecked = event.target.checked
  group.members.forEach(m => {
    const idx = selectedBatchMembers.value.indexOf(m.slotId)
    if (isChecked && idx === -1) selectedBatchMembers.value.push(m.slotId)
    else if (!isChecked && idx > -1) selectedBatchMembers.value.splice(idx, 1)
  })
}

// 一鍵批量配置方法
const batchApplyRole = () => {
  if (selectedBatchMembers.value.length === 0) return alert('請先勾選要批量修改的成員！')
  const val = prompt('請輸入要批次套用的【聯賽職能】：', 'D潮拆塔')
  if (val !== null) {
    batchMemberGroups.value.forEach(g => {
      g.members.forEach(m => {
        if (selectedBatchMembers.value.includes(m.slotId)) m.roles = val.trim()
      })
    })
  }
}

const batchApplyJueji = () => {
  if (selectedBatchMembers.value.length === 0) return alert('請先勾選要批量修改的成員！')
  const val = prompt('請輸入要批次套用的【絕技】：', '狂發一怒')
  if (val !== null) {
    batchMemberGroups.value.forEach(g => {
      g.members.forEach(m => {
        if (selectedBatchMembers.value.includes(m.slotId)) m.jueji = val.trim()
      })
    })
  }
}

const batchApplyQunxia = () => {
  if (selectedBatchMembers.value.length === 0) return alert('請先勾選要批量修改的成員！')
  const val = prompt('請輸入要批次套用的【群俠百家】：', '咚咚跳台')
  if (val !== null) {
    batchMemberGroups.value.forEach(g => {
      g.members.forEach(m => {
        if (selectedBatchMembers.value.includes(m.slotId)) m.qunxia = val.trim()
      })
    })
  }
}

const batchApplyLiupai = () => {
  if (selectedBatchMembers.value.length === 0) return alert('請先勾選要批量修改的成員！')
  const val = prompt('請輸入要批次套用的【流派技能】：', '清泉')
  if (val !== null) {
    batchMemberGroups.value.forEach(g => {
      g.members.forEach(m => {
        if (selectedBatchMembers.value.includes(m.slotId)) m.zhuangbei = val.trim()
      })
    })
  }
}

const saveBatchEdit = () => {
  batchMemberGroups.value.forEach(g => {
    g.members.forEach(m => {
      if (m.slotRef) {
        m.slotRef.roles = m.roles ? [m.roles] : []
        m.slotRef.jueji = m.jueji
        m.slotRef.qunxia = m.qunxia
        m.slotRef.zhuangbei = m.zhuangbei
      }
    })
  })
  showBatchEditModal.value = false
}

// 置中清空陣容 Modal
const showConfirmModal = ref(false)
const confirmTitle = ref('')
const confirmMessage = ref('')
const showOtherOpsDropdown = ref(false)

const confirmClearRoster = () => {
  showOtherOpsDropdown.value = false
  confirmTitle.value = '清空陣容'
  confirmMessage.value = '將清空本場全部排表，頁面會刷新；此操作不可撤銷。'
  showConfirmModal.value = true
}

const executeConfirmAction = () => {
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
  showConfirmModal.value = false
}

const showTemplateDropdown = ref(false)
const appliedTemplateName = ref('')

const templateOptions = [
  { id: 1, name: '甲組通用模板' },
  { id: 2, name: '乙組防守模板' }
]

const applyRosterTemplate = (tpl) => {
  appliedTemplateName.value = tpl.name
  showTemplateDropdown.value = false

  matrixTeams.value[0].squads[0].slots.forEach((s, idx) => {
    if (idx === 0) s.templateConfig.roles = ['統戰', '指揮']
    if (idx === 1) s.templateConfig.roles = ['保鏢拆', '純保鏢']
  })
}

const formatArrayText = (arr) => {
  if (!arr || !Array.isArray(arr) || arr.length === 0) return '—'
  return arr.join('、')
}

const saveRosterBoard = () => {
  alert('陣容保存成功！')
}
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

/* 左側待選成員側邊欄 */
.pending-sidebar { width: 230px; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.guild-select-box { background: #f8fafc; border: 1px solid #e2e8f0; padding: 8px 12px; border-radius: 6px; font-weight: bold; font-size: 13px; color: #1e293b; margin-bottom: 12px; }

.pending-filter-bar { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
.pending-title-group { display: flex; justify-content: space-between; align-items: center; width: 100%; }
.title-left-box { display: flex; align-items: center; gap: 4px; }
.pending-title { font-weight: bold; font-size: 13px; color: #334155; }
.btn-icon-add { background: none; border: none; color: #3b82f6; font-size: 18px; font-weight: bold; cursor: pointer; }

/* 待選模式切換按鈕 */
.pending-mode-toggle { display: flex; border: 1px solid #cbd5e1; border-radius: 6px; overflow: hidden; background: #ffffff; }
.mode-pill-btn { padding: 2px 8px; border: none; background: white; font-size: 11px; cursor: pointer; color: #64748b; }
.mode-pill-btn.active { background: #5b7db1; color: white; font-weight: bold; }

.pending-search-input { width: 100%; padding: 6px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box; }

/* 流派 Icon 快篩列 */
.school-icon-filter-row { display: flex; flex-wrap: wrap; gap: 4px; padding-bottom: 8px; border-bottom: 1px solid #f1f5f9; margin-bottom: 8px; }
.icon-filter-item { width: 26px; height: 26px; border-radius: 4px; border: 1px solid transparent; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.icon-filter-item.active, .icon-filter-item:hover { background: #eff6ff; border-color: #3b82f6; }
.school-filter-img { width: 18px; height: 18px; object-fit: contain; }

/* 流派手風琴模式 */
.school-accordion-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
.accordion-item { border-bottom: 1px solid #f8fafc; }
.accordion-head { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; cursor: pointer; font-size: 12px; }
.accordion-head-left { display: flex; align-items: center; gap: 6px; font-weight: 500; }
.accordion-school-img { width: 16px; height: 16px; object-fit: contain; }
.accordion-count { color: #94a3b8; }
.accordion-arrow { font-size: 16px; color: #94a3b8; }

.accordion-body { padding: 4px 0 8px 10px; display: flex; flex-direction: column; gap: 4px; }

/* 全員向下流動模式 */
.all-members-flow-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-top: 4px; }

.member-drag-card { display: flex; align-items: center; gap: 6px; background: #f0f9ff; border: 1px solid #bae6fd; padding: 6px 10px; border-radius: 6px; font-size: 12px; cursor: grab; color: #0369a1; transition: transform 0.15s; }
.member-drag-card:hover { transform: translateX(2px); }
.drag-card-icons-group { display: flex; align-items: center; gap: 2px; }
.drag-card-icon { width: 16px; height: 16px; object-fit: contain; }
.drag-card-icon-sub { width: 13px; height: 13px; object-fit: contain; opacity: 0.85; }
.empty-sub-text { font-size: 11px; color: #cbd5e1; padding: 4px 0; }

/* 右側矩陣內容區 */
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

.btn-secondary-sm { background: #ffffff; border: 1px solid #cbd5e1; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; color: #334155; }
.btn-primary-sm { background: #3b82f6; color: white; border: none; padding: 4px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.template-select-label { font-size: 12px; color: #64748b; font-weight: bold; }

.custom-select-wrapper { position: relative; width: 160px; }
.custom-select-input { display: flex; align-items: center; justify-content: space-between; padding: 4px 10px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; }
.custom-select-dropdown { position: absolute; top: 100%; right: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); z-index: 100; }
.dropdown-item { padding: 8px 12px; font-size: 12px; cursor: pointer; }
.dropdown-item:hover { background: #f1f5f9; }

/* 團隊矩陣橫列 */
.teams-matrix-wrapper { display: flex; flex-direction: column; gap: 16px; overflow-y: auto; }
.team-matrix-row { background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; padding: 14px; }

.team-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.team-title-edit-group { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 2px 6px; border-radius: 4px; }
.team-title-edit-group:hover { background: #f1f5f9; }
.team-row-title { font-size: 14px; font-weight: bold; color: #1e293b; }
.team-row-desc { font-size: 13px; color: #94a3b8; font-weight: normal; margin-left: 2px; }
.team-pencil-icon { font-size: 14px; color: #94a3b8; }

.add-squad-btn { background: none; border: 1px dashed #3b82f6; color: #3b82f6; padding: 2px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; }

.squads-matrix-grid { display: grid; grid-template-columns: repeat(5, minmax(170px, 1fr)); gap: 10px; }
.squad-column-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 8px; }

.squad-column-head.draggable-head { display: flex; flex-direction: column; align-items: center; margin-bottom: 8px; cursor: grab; padding: 4px; border-radius: 4px; }
.squad-column-head.draggable-head:hover { background: #e2e8f0; }
.drag-handle-icon { font-size: 12px; color: #94a3b8; }

.squad-head-title { font-size: 12px; font-weight: bold; color: #475569; display: flex; align-items: center; gap: 2px; }
.squad-head-desc { font-size: 11px; color: #94a3b8; font-style: italic; margin-top: 2px; font-weight: normal; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 150px; }

.slots-vertical-list { display: flex; flex-direction: column; gap: 6px; }
.matrix-slot-card { position: relative; height: 38px; border-radius: 4px; border: 1px dashed #cbd5e1; background: #ffffff; display: flex; align-items: center; padding: 0 8px; cursor: pointer; transition: all 0.15s; }
.matrix-slot-card:hover { border-color: #3b82f6; }

.matrix-slot-card.has-member { border: 1px solid #cbd5e1; cursor: grab; }
.assigned-slot-content { display: flex; flex-direction: column; width: 100%; }
.member-head-info { display: flex; align-items: center; gap: 4px; }
.slot-school-icon { width: 16px; height: 16px; object-fit: contain; }
.slot-school-icon-sub { width: 12px; height: 12px; object-fit: contain; opacity: 0.85; margin-left: -2px; }
.slot-member-name { font-size: 12px; font-weight: bold; color: #1e293b; }
.slot-roles-text { font-size: 10px; color: #64748b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 淺色預設模板指導 */
.matrix-slot-card.template-guideline { background: #fafafa; border: 1px solid #f1f5f9; }
.template-guideline-content { font-size: 10px; color: #94a3b8; }
.empty-slot-placeholder { font-size: 10px; color: #cbd5e1; width: 100%; text-align: center; }

.slot-clear-x { position: absolute; right: 4px; top: 2px; font-size: 12px; color: #94a3b8; cursor: pointer; opacity: 0; }
.matrix-slot-card:hover .slot-clear-x { opacity: 1; }
.slot-clear-x:hover { color: #ef4444; }

/* 下拉選單組件 */
.custom-dropdown-container { position: relative; flex: 1; display: flex; align-items: center; }
.dropdown-toggle-btn { position: absolute; right: 4px; background: none; border: none; color: #94a3b8; cursor: pointer; padding: 4px 6px; font-size: 16px; display: flex; align-items: center; justify-content: center; }
.dropdown-toggle-btn i { transition: transform 0.2s; }
.dropdown-toggle-btn i.rotate { transform: rotate(180deg); }

.skill-dropdown-panel { position: absolute; top: 100%; left: 0; width: 100%; margin-top: 4px; background: white; border: 1px solid #cbd5e1; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); max-height: 160px; overflow-y: auto; z-index: 120; padding: 4px 0; }

/* 編輯團隊 Modal 樣式 */
.modal-title-with-sub { display: flex; align-items: baseline; gap: 8px; }
.modal-sub-desc { font-size: 12px; color: #94a3b8; font-weight: normal; }

.team-tab-pills-row { display: flex; gap: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; }
.team-tab-pill { background: #ffffff; border: 1px solid #cbd5e1; padding: 6px 16px; border-radius: 6px; font-size: 13px; cursor: pointer; color: #475569; }
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
.wide-card { width: 780px; max-height: 85vh; overflow-y: auto; }
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

/* 批量編輯 Modal (圖五對應) */
.batch-modal-card { max-height: 85vh; overflow-y: auto; }
.batch-toolbar-top { display: flex; align-items: center; font-size: 13px; font-weight: bold; flex-wrap: wrap; gap: 8px; }
.batch-table-container { display: flex; flex-direction: column; gap: 16px; }
.batch-group-block { border: 1px solid #e2e8f0; border-radius: 6px; overflow: hidden; }
.batch-group-title { background: #f8fafc; padding: 8px 12px; font-size: 12px; font-weight: bold; color: #475569; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; }
.batch-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.batch-table th, .batch-table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; text-align: left; }
.batch-table th { background: #ffffff; color: #64748b; font-weight: 600; }
.table-inline-input { width: 100%; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; box-sizing: border-box; outline: none; background: white; }
.table-inline-select { width: 100%; padding: 4px 6px; border: 1px solid #cbd5e1; border-radius: 4px; font-size: 12px; outline: none; background: white; }

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
.confirm-modal-footer { display: flex; justify-content: center; gap: 12px; margin-top: 20px; }

.btn-primary { background: #3b82f6; color: white; border: none; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
.btn-primary.btn-red { background: #ef4444; }
.btn-secondary { background: #f1f5f9; color: #334155; border: 1px solid #cbd5e1; padding: 6px 14px; border-radius: 6px; font-size: 12px; cursor: pointer; }
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