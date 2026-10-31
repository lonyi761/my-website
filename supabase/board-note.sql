-- =====================================================================
-- 排表頁頂部備註與聯賽列表備註分開
-- notes：聯賽列表的「備註」（本場注意事項）
-- board_note：排表頁頂部的備註（會出現在導出圖片，給其他團隊看）
-- 既有聯賽先把原本的備註複製一份到 board_note，畫面維持不變，之後兩邊各自修改
-- =====================================================================
alter table public.guild_rosters
  add column if not exists board_note text not null default '';

update public.guild_rosters
set board_note = coalesce(notes, '')
where board_note = '' and coalesce(notes, '') <> '';
