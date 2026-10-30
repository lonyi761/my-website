-- =====================================================================
-- 戰績數據第 1 階段：聯賽每一場上傳遊戲匯出的戰績 CSV
-- 需先完成 security-step1.sql、security-step2.sql。可整份一次執行。
-- =====================================================================

-- 每個聯賽的每一場最多一份戰績；my_players / opp_players 存 CSV 解析後的玩家數據
create table if not exists public.match_stats (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.guild_rosters(id) on delete cascade,
  guild_id uuid not null references public.guilds(id) on delete cascade,
  match_index integer not null check (match_index >= 0),
  file_name text not null default '',
  played_at timestamptz,
  my_name text not null default '',
  opp_name text not null default '',
  my_players jsonb not null default '[]'::jsonb,
  opp_players jsonb not null default '[]'::jsonb,
  uploaded_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (league_id, match_index)
);
create index if not exists match_stats_guild_idx on public.match_stats (guild_id);

grant select, insert, update, delete on public.match_stats to authenticated;

alter table public.match_stats enable row level security;

-- guild_id 必須和所屬聯賽一致，避免把數據掛到別的幫會
create or replace function public.match_stats_guild_matches(lid uuid, gid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.guild_rosters r where r.id = lid and r.guild_id = gid)
$$;

drop policy if exists match_stats_select on public.match_stats;
drop policy if exists match_stats_insert on public.match_stats;
drop policy if exists match_stats_update on public.match_stats;
drop policy if exists match_stats_delete on public.match_stats;
create policy match_stats_select on public.match_stats for select to authenticated
  using (public.can_view_guild(guild_id::text));
create policy match_stats_insert on public.match_stats for insert to authenticated
  with check (public.can_edit_guild(guild_id::text) and public.match_stats_guild_matches(league_id, guild_id));
create policy match_stats_update on public.match_stats for update to authenticated
  using (public.can_edit_guild(guild_id::text))
  with check (public.can_edit_guild(guild_id::text) and public.match_stats_guild_matches(league_id, guild_id));
create policy match_stats_delete on public.match_stats for delete to authenticated
  using (public.can_edit_guild(guild_id::text));
