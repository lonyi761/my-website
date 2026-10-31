-- =====================================================================
-- 快速分析的分享連結
-- 任何人（不用登入）都能用連結看單場戰績；建立連結需要登入（避免匿名大量寫入）
-- 不開放直接查詢整張表：沒有登入的人只能透過 get_shared_report(id) 用連結上的 id 讀一筆
-- 需先完成 security-step1.sql、security-step2.sql（使用 is_active_user）。
-- =====================================================================
create table if not exists public.shared_reports (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null default auth.uid() references auth.users(id) on delete cascade,
  file_name text not null default '',
  played_at timestamptz,
  my_name text not null default '',
  opp_name text not null default '',
  result text not null default '' check (result in ('', 'win', 'loss')),
  my_players jsonb not null default '[]'::jsonb,
  opp_players jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  -- 一場最多 200 人、資料量上限約 400KB，避免被塞入過大的資料
  constraint shared_reports_size check (
    jsonb_array_length(my_players) <= 200 and jsonb_array_length(opp_players) <= 200
    and octet_length(my_players::text) + octet_length(opp_players::text) < 400000
  )
);
create index if not exists shared_reports_owner_idx on public.shared_reports (created_by, created_at desc);

alter table public.shared_reports enable row level security;
revoke all on public.shared_reports from anon;
grant select, insert, delete on public.shared_reports to authenticated;

drop policy if exists shared_reports_select_own on public.shared_reports;
drop policy if exists shared_reports_insert on public.shared_reports;
drop policy if exists shared_reports_delete_own on public.shared_reports;
-- 登入者只能直接查到自己建立的分享（我的分享清單）
create policy shared_reports_select_own on public.shared_reports for select to authenticated
  using (created_by = auth.uid());
create policy shared_reports_insert on public.shared_reports for insert to authenticated
  with check (created_by = auth.uid() and public.is_active_user());
create policy shared_reports_delete_own on public.shared_reports for delete to authenticated
  using (created_by = auth.uid());

-- 用連結上的 id 讀取一筆分享（不需登入）
create or replace function public.get_shared_report(rid uuid)
returns table (
  id uuid, file_name text, played_at timestamptz, my_name text, opp_name text,
  result text, my_players jsonb, opp_players jsonb, created_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select s.id, s.file_name, s.played_at, s.my_name, s.opp_name, s.result, s.my_players, s.opp_players, s.created_at
  from public.shared_reports s where s.id = rid
$$;
revoke all on function public.get_shared_report(uuid) from public;
grant execute on function public.get_shared_report(uuid) to anon, authenticated;
