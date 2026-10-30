-- =====================================================================
-- 戰績數據第 2 階段：CSV 玩家手動對應到成員
-- 需先完成 match-stats-phase1.sql。可整份一次執行。
-- =====================================================================

-- { "CSV 玩家名": "成員 id" 或 "__none__"（標記為非成員／外援） }
-- 自動比對（名字、曾用名）不存，只存手動指定的部分
alter table public.match_stats
  add column if not exists member_links jsonb not null default '{}'::jsonb;
