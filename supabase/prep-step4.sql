-- =====================================================================
-- 第 4 步：排表模板、報名問題存進資料庫（依幫會分開，權限同其他幫會資料）
-- 需先完成 security-step1.sql、security-step2.sql。可整份一次執行。
-- =====================================================================

-- 排表模板：teams 存整份團隊／小隊／席位設定（格式同戰備頁編輯器）
create table if not exists public.lineup_templates (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  name text not null,
  description text not null default '',
  teams jsonb not null default '[]'::jsonb,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lineup_templates_guild_idx on public.lineup_templates (guild_id);

-- 報名問題
create table if not exists public.signup_questions (
  id uuid primary key default gen_random_uuid(),
  guild_id uuid not null references public.guilds(id) on delete cascade,
  title text not null,
  type text not null default 'radio' check (type in ('radio', 'checkbox', 'text')),
  options jsonb not null default '[]'::jsonb,
  placeholder text not null default '',
  is_required boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists signup_questions_guild_idx on public.signup_questions (guild_id);

grant select, insert, update, delete on public.lineup_templates, public.signup_questions to authenticated;

alter table public.lineup_templates enable row level security;
alter table public.signup_questions enable row level security;

drop policy if exists templates_select on public.lineup_templates;
drop policy if exists templates_insert on public.lineup_templates;
drop policy if exists templates_update on public.lineup_templates;
drop policy if exists templates_delete on public.lineup_templates;
create policy templates_select on public.lineup_templates for select to authenticated
  using (public.can_view_guild(guild_id::text));
create policy templates_insert on public.lineup_templates for insert to authenticated
  with check (public.can_edit_guild(guild_id::text));
create policy templates_update on public.lineup_templates for update to authenticated
  using (public.can_edit_guild(guild_id::text))
  with check (public.can_edit_guild(guild_id::text));
create policy templates_delete on public.lineup_templates for delete to authenticated
  using (public.can_edit_guild(guild_id::text));

drop policy if exists questions_select on public.signup_questions;
drop policy if exists questions_insert on public.signup_questions;
drop policy if exists questions_update on public.signup_questions;
drop policy if exists questions_delete on public.signup_questions;
create policy questions_select on public.signup_questions for select to authenticated
  using (public.can_view_guild(guild_id::text));
create policy questions_insert on public.signup_questions for insert to authenticated
  with check (public.can_edit_guild(guild_id::text));
create policy questions_update on public.signup_questions for update to authenticated
  using (public.can_edit_guild(guild_id::text))
  with check (public.can_edit_guild(guild_id::text));
create policy questions_delete on public.signup_questions for delete to authenticated
  using (public.can_edit_guild(guild_id::text));

-- 沿用原本的示範題目：每個還沒有題目的幫會各建一題「聯賽是否開MIC」
insert into public.signup_questions (guild_id, title, type, options, is_required, sort_order)
select g.id, '聯賽是否開MIC', 'radio', '["能", "不能"]'::jsonb, true, 1
from public.guilds g
where not exists (select 1 from public.signup_questions q where q.guild_id = g.id);
