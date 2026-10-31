-- =====================================================================
-- 聯賽場次的戰績也能產生分享連結（沿用 shared_reports）
-- 需先完成 match-stats-phase1.sql、shared-reports.sql
-- =====================================================================

-- 這一場目前的分享連結（同幫會的人都看得到）；分享被刪除時自動清空
alter table public.match_stats
  add column if not exists share_id uuid references public.shared_reports(id) on delete set null;

-- 這份分享是否掛在「目前使用者有編輯權」的聯賽場次上
-- 用 security definer 直接查 match_stats，不受該表的讀取權限影響
create or replace function public.can_manage_shared_report(rid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.match_stats m
    where m.share_id = rid and public.can_edit_guild(m.guild_id::text)
  )
$$;
revoke all on function public.can_manage_shared_report(uuid) from public;
grant execute on function public.can_manage_shared_report(uuid) to authenticated;

-- 聯賽場次的分享：該幫會有編輯權的人都能取消（不限建立者）
-- 刪除時資料列也必須「看得到」，所以讀取權限一併開放給同一批人
drop policy if exists shared_reports_select_guild on public.shared_reports;
drop policy if exists shared_reports_delete_guild on public.shared_reports;
create policy shared_reports_select_guild on public.shared_reports for select to authenticated
  using (public.can_manage_shared_report(id));
create policy shared_reports_delete_guild on public.shared_reports for delete to authenticated
  using (public.can_manage_shared_report(id));
