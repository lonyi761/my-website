# 聯賽排表（RosterBoard）盤點與待優化清單

> 盤點日期：2026-10-30｜範圍：`src/views/League.vue`、`src/views/league/**`
> 本文件只記錄觀察到的問題與建議，**下列項目皆尚未修改**，由你決定是否處理。
> 行號以加入「候補／不出席席位區」之後的版本為準。

---

## 一、目前架構理解（摘要）

| 部分 | 說明 |
|---|---|
| `League.vue` | 聯賽列表、建立/編輯聯賽表單、複製聯賽、比賽結果/對手。選「排表」後切到 `RosterBoard`。 |
| `RosterBoard.vue` | 排表主頁：載入成員、載入/保存陣容、拖拽、所有 Modal（批量編輯、席位配置、成員編輯、導出圖片…）。 |
| `RosterSidebar.vue` | 左側待選成員（只列出 `assigned === false` 的成員），按流派/全員顯示。 |
| `RosterMatrixView.vue` / `RosterTableView.vue` | 同一份 `matrixTeams` 的兩種呈現（卡片矩陣 / 試算表），導出圖片時也重用。 |
| 資料表 `guild_rosters.matrix_teams` | JSON 陣列：`團隊 → squads(小隊) → slots(席位)`；席位內 `assignedMember` 存的是**整份成員快照**。 |
| 上陣職業統計 | `schoolAssignedCounts`：遍歷所有席位的 `assignedMember.currentSchool` 計數。 |
| 權限 | `canEditCurrentGuild`：`super_admin` 或 `profile.edit_guild_ids` 含該幫會 → 可編輯，否則唯讀。 |

### 本次新增：候補／不出席席位區
- 新元件 `RosterBenchZone.vue`，位於上陣職業統計列下方，兩個區：**候補**、**不出席**。
- 可從待選成員、排表席位、另一區拖入；從席位區拖到排表席位時，若該席位已有人會**互換**（被換下的人回到原區同位置）；`×` 移回待選。
- 資料**不需改資料庫**：保存時以 `{ kind: '__bench__', substitutes, absentees }` 附加在 `matrix_teams` 尾端，讀取時拆出（見 `src/views/league/rosterBench.js`）。兩區皆空時不寫入，舊資料格式不變。
- 不計入上陣職業統計（統計只看團隊席位）；席位區成員不會再出現在待選清單。
- 導出圖片：側欄新增「顯示候補名單」開關（有候補時預設開啟）；**不出席永不顯示**。
- 複製聯賽：候補保留（剔除已離幫者），不出席清空（屬單場狀態）。
- 清空陣容會一併清空席位區。

> 若之後想改成獨立欄位（較乾淨），可在 Supabase 執行
> `alter table guild_rosters add column bench_seats jsonb default '{"substitutes":[],"absentees":[]}';`
> 再把 `rosterBench.js` 的 split/merge 改為讀寫該欄位即可。

---

## 二、問題清單

### 🔴 高優先（可能造成資料遺失或誤操作）

1. **「清空陣容」可能執行到上一次被取消的動作（例如刪除團隊）**
   `confirmClearRoster`（[RosterBoard.vue:2310](../src/views/league/RosterBoard.vue)）沒有把 `confirmActionCallback` 清成 `null`。
   重現：編輯團隊 → 移除團隊 → 在確認框按「取消」→ 再按「清空陣容」→ 確定 ⇒ 實際執行的是**刪除團隊**，而不是清空。
   建議：`confirmClearRoster` 內先 `confirmActionCallback = null`，或取消時一併清除 callback。

2. **新增／編輯成員後，未保存的排表會被資料庫版本覆蓋**
   `saveNewMember`、`saveFullMemberEdit` 最後都呼叫 `fetchRosterDataFromDB()`（[:1685](../src/views/league/RosterBoard.vue)、[:2104](../src/views/league/RosterBoard.vue)），會重新讀取 `matrix_teams`，把尚未按「保存陣容」的拖拽結果（含席位區）全部蓋掉。
   建議：拆出「只重新載入成員」的函式，成員更新後只刷新 `allMembers`。

3. **找不到該幫會成員時，會載入「所有幫會」的成員**
   [:1505](../src/views/league/RosterBoard.vue) `if (matchedMembers.length === 0) matchedMembers = membersData`。新幫會或名稱對不上時，會把其他幫會成員顯示在待選清單，可能被排進陣容。
   建議：移除此 fallback；並改為 `.eq('guild_id', id)` 直接在資料庫篩選（同時減少傳輸量與資料外洩風險）。

4. **聯賽層級操作沒有檢查編輯權限**
   `League.vue` 的刪除聯賽（[:677](../src/views/League.vue)）、編輯聯賽、修改比賽結果/對手，只要能看到該聯賽就能操作，沒有檢查 `edit_guild_ids`。前端的 `canEditCurrentGuild` 也只是 UI 限制。
   建議：前端補上與 RosterBoard 相同的權限判斷，並確認 Supabase RLS 已限制 `guild_rosters` / `guild_members` 的寫入。

5. **多人同時編輯會互相覆蓋**
   保存時整份 `matrix_teams` 直接覆寫，後保存者會蓋掉先保存者的修改，且無提示。
   建議：保存前比對 `updated_at`，不同則提示「已有其他人更新，是否覆蓋／重新載入」。

### 🟠 中優先（功能不符預期）

6. **Supabase 錯誤多數未被檢查**
   `saveLeagueForm`、`saveMatchResults`、`saveMatchOpponents`、`confirmDeleteLeague` 只 `await` 不讀 `error`；supabase-js 不會 throw，所以 `try/catch` 抓不到，失敗時使用者看不到任何提示。

7. **「交換兩隊位置」的勾選項與實際行為不一致**
   `executeSwapSquad`（[:1842](../src/views/league/RosterBoard.vue)）整個交換 `slots`，所以成員與排表模板（`templateConfig`）**永遠**一起交換；「交換排表模板」勾選框沒有作用，取消勾選也一樣會換。

8. **陣容模板是寫死的示範資料**
   `templateOptions` 只有兩個固定選項，`applyRosterTemplate`（[:2351](../src/views/league/RosterBoard.vue)）只改第一團第一隊前兩席；若沒有任何團隊會直接報錯（`matrixTeams.value[0]` 為 undefined）。

9. **移除席位成員後，職能／技能殘留在空席位**
   `removeMemberFromSlot` 只清 `assignedMember`，`roles / jueji / qunxia / zhuangbei` 仍留著；詳情模式與試算表會把殘留值當成該席位的設定顯示，下一位拖入的成員也會繼承舊的絕技/技能。（拖到席位區時沿用相同行為，以保持一致。）

10. **席位存的是成員快照，成員資料更新不會同步到已保存的排表**
    若成員在「成員管理」改了當前流派或名字，舊排表仍顯示舊資料，上陣職業統計也以舊流派計算。
    建議：席位只存 `memberId`（加少量顯示用欄位），顯示時以 `allMembers` 即時對照。

11. **複製聯賽時以「名字」比對也算仍在幫**
    名字相同但 id 不同（例如退幫後重新加入）時，會保留舊 id 的快照 → 該成員同時出現在席位與待選清單，可能被重複安排。

12. **`showDisplaySettingModal` 未宣告**
    `League.vue:200` 的「設置」按鈕指向未定義的狀態，點擊沒有效果（開發模式下會有 Vue 警告）。`saveAsDefault`（保存為預設配置）勾選後也沒有任何程式使用。

13. **試算表頂部備註不會保存**
    `RosterTableView` 的 `topBannerText`（[:244](../src/views/league/components/RosterTableView.vue)）是元件內部狀態，預設為「我是團隊備註會顯示的地方」，重新進入頁面就還原，也會被導出到圖片。

14. **新聯賽／刪光團隊後會出現示範團隊**
    `matrix_teams` 為空時沿用程式內預設的「進攻一團」（備註「我是團隊備註會顯示的地方」）；刪光所有團隊並保存後重新進入，示範團隊會再出現。

15. **`saveRosterBoard` 在沒有聯賽 id 時也顯示成功**
    `props.leagueItem.id` 不存在時不會寫入，但仍提示「陣容成功儲存」。

### 🟡 低優先（一致性／維護性）

16. **矩陣與試算表的職能顯示邏輯不同**：試算表會 fallback 到成員職能偏好與模板職能，矩陣不會；同一席位在兩種版型顯示不同內容。
17. **「清空陣容」提示寫「頁面會刷新」**，實際不會刷新，也不會自動保存（需再按保存陣容）。
18. **常數重複定義**：`availableSchools`、`schoolColorMap`、`getSchoolImg` 等在 4 個檔案各寫一份，新增流派時需同步修改多處；可抽到共用檔（例如與 `rosterBench.js` 同層的 `rosterConstants.js`）。
19. **`html2canvas` 已在 `package.json`，但程式從 CDN 動態載入**，離線或 CDN 被擋時導出會失敗；可直接 `import html2canvas from 'html2canvas'`。
20. **`RosterBoard.vue` 約 2,500 行**：Modal 可逐步拆成獨立元件（批量編輯、席位配置、成員編輯、導出預覽），降低之後修改的風險。
21. **一次撈取整張 `guilds`、`guild_members` 表**再在前端過濾；資料量變大後會變慢，且非本幫會資料也會傳到瀏覽器。
22. **ID 產生方式**：席位用 `Math.random()`、小隊用 `Date.now()`，同一毫秒新增時可能重複；可改用 `crypto.randomUUID()`。

---

## 三、建議處理順序
1. 第 1、2 點（一行～數行即可修，影響最大）
2. 第 3、4、6 點（資料正確性與權限）
3. 第 9、10 點（若之後要做出席率／上陣統計報表，快照問題會影響準確度）
4. 其餘依需求排程
