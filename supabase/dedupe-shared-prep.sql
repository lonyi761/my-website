-- =====================================================================
-- （選用）清掉「跨幫會共用」職能／技能中重複的資料列
-- 網頁已會自動去除重複顯示，這份只是讓資料庫本身也乾淨；執行前請先跑第 1 段預覽。
-- 2026-10-31 檢查時：共用職能 38 列、不重複 20 個；共用技能 42 列、不重複 40 個
-- 只處理 guild_id 為空（共用）的資料，不動各幫會自己的設定。
-- =====================================================================

-- 1. 預覽：會被刪除的重複列（同類型、同名稱只保留排序最前的一列）
select 'role' as kind, type as category, name, sort_order
from (
  select *, row_number() over (partition by type, name order by sort_order, ctid) as rn
  from public.preparation_roles where guild_id is null
) r where rn > 1
union all
select 'skill', category, content, sort_order
from (
  select *, row_number() over (partition by category, content order by sort_order, ctid) as rn
  from public.preparation_skills where guild_id is null
) s where rn > 1
order by 1, 2, 3;

-- 2. 確認預覽無誤後再執行刪除
-- delete from public.preparation_roles where ctid in (
--   select ctid from (
--     select ctid, row_number() over (partition by type, name order by sort_order, ctid) as rn
--     from public.preparation_roles where guild_id is null
--   ) t where rn > 1
-- );
-- delete from public.preparation_skills where ctid in (
--   select ctid from (
--     select ctid, row_number() over (partition by category, content order by sort_order, ctid) as rn
--     from public.preparation_skills where guild_id is null
--   ) t where rn > 1
-- );
