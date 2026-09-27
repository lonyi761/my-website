<template>
  <div class="lineup-template">
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
              <input type="text" v-model="squad.zhineng" placeholder="設定小隊職能" class="squad-input" />
            </div>
            <div class="slot-list">
              <div v-for="(slot, slotIdx) in squad.slots" :key="slotIdx" class="slot-item">
                <span class="slot-num">#{{ slotIdx + 1 }}</span>
                <input type="text" v-model="slot.zhineng_list[0]" placeholder="選取/填寫個人職能" class="slot-input" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

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
</script>

<style scoped>
.prep-header h2 { margin: 0 0 8px 0; font-size: 16px; }
.sub-notice { font-size: 12px; color: #64748b; line-height: 1.5; margin: 0 0 20px 0; background: #f8fafc; padding: 10px 14px; border-radius: 6px; border-left: 3px solid #3b82f6; }

.template-matrix { display: flex; flex-direction: column; gap: 20px; }
.team-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; background: #f8fafc; }
.team-title { margin: 0 0 12px 0; font-size: 15px; color: #1e293b; }
.squad-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.squad-box { background: white; border: 1px solid #cbd5e1; border-radius: 6px; padding: 10px; }
.squad-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-weight: bold; font-size: 12px; }
.squad-input { width: 100px; padding: 2px 6px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; }
.slot-list { display: flex; flex-direction: column; gap: 4px; }
.slot-item { display: flex; align-items: center; justify-content: space-between; font-size: 11px; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; }
.slot-num { color: #64748b; }
.slot-input { width: 110px; font-size: 11px; border: 1px solid #cbd5e1; border-radius: 4px; padding: 2px 4px; }
</style>