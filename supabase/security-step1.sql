-- =====================================================================
-- 資安第 1 步：開啟資料列權限（RLS）並保護 profiles 權限欄位
-- 在 Supabase 後台 → SQL Editor 依「第 0～3 段」順序分次執行。
-- 說明與測試步驟見 docs/security-step1-guide.md
-- =====================================================================


-- ---------------------------------------------------------------------
-- 第 0 段：檢查（只讀，不會改任何東西）
-- 看目前有哪些資料表、RLS 是否開啟、是否已有舊規則。
-- ---------------------------------------------------------------------
select tablename, rowsecurity as rls_enabled
from pg_tables where schemaname = 'public' order by tablename;

select tablename, policyname, cmd, roles
from pg_policies where schemaname = 'public' order by tablename, policyname;


-- ---------------------------------------------------------------------
-- 第 1 段：權限判斷函式 + profiles 保護
-- 執行後網站行為不變（RLS 尚未開啟），只是先把規則準備好。
-- 欄位型別不論是 uuid[]、text[] 或 jsonb 都適用（統一轉成 jsonb 比對）。
-- ---------------------------------------------------------------------

create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;

create or replace function public.can_view_guild(gid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and (
      p.role = 'super_admin'
      or coalesce(to_jsonb(p.view_guild_ids), '[]'::jsonb) ? gid
      or coalesce(to_jsonb(p.edit_guild_ids), '[]'::jsonb) ? gid
      or coalesce(to_jsonb(p.guild_ids), '[]'::jsonb) ? gid
      or p.guild_id::text = gid
    )
  );
$$;

create or replace function public.can_edit_guild(gid text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and (
      p.role = 'super_admin'
      or coalesce(to_jsonb(p.edit_guild_ids), '[]'::jsonb) ? gid
    )
  );
$$;

-- 至少有一個幫會的編輯權（用於跨幫會共用技能）
create or replace function public.has_any_edit_guild()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid() and (
      p.role = 'super_admin'
      or jsonb_array_length(coalesce(to_jsonb(p.edit_guild_ids), '[]'::jsonb)) > 0
    )
  );
$$;

-- 非總管理員不得變更自己的角色、到期日、狀態與幫會授權。
-- 從 SQL Editor（postgres）或伺服器端（service_role）執行的修改不受限制。
create or replace function public.protect_profile_fields()
returns trigger language plpgsql as $$
begin
  if current_user not in ('authenticated', 'anon') or public.is_super_admin() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.role, 'member') <> 'member'
       or new.expire_at > now() + interval '8 days'
       or new.guild_id is not null
       or coalesce(to_jsonb(new.guild_ids), '[]'::jsonb) <> '[]'::jsonb
       or coalesce(to_jsonb(new.view_guild_ids), '[]'::jsonb) <> '[]'::jsonb
       or coalesce(to_jsonb(new.edit_guild_ids), '[]'::jsonb) <> '[]'::jsonb then
      raise exception '新帳號只能以一般幫眾、7 天試用建立';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.expire_at is distinct from old.expire_at
     or new.status is distinct from old.status
     or new.guild_id is distinct from old.guild_id
     or to_jsonb(new.guild_ids) is distinct from to_jsonb(old.guild_ids)
     or to_jsonb(new.view_guild_ids) is distinct from to_jsonb(old.view_guild_ids)
     or to_jsonb(new.edit_guild_ids) is distinct from to_jsonb(old.edit_guild_ids) then
    raise exception '只有總管理員可以修改角色、到期日、狀態與幫會權限';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before insert or update on public.profiles
  for each row execute function public.protect_profile_fields();


-- ---------------------------------------------------------------------
-- 第 2 段：清掉舊規則、建立新規則（RLS 仍未開啟，網站行為不變）
-- 舊規則在 RLS 關閉時沒有作用；若不清掉，像「全部允許」這類舊規則
-- 會在開啟 RLS 後繼續放行，等於沒開。
-- ---------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('profiles', 'guilds', 'guild_members', 'guild_rosters',
                        'preparation_roles', 'preparation_skills')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- profiles：自己那一筆；總管理員可看、可改全部
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_super_admin());
create policy profiles_insert on public.profiles for insert to authenticated
  with check (id = auth.uid() or public.is_super_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_super_admin())
  with check (id = auth.uid() or public.is_super_admin());
create policy profiles_delete on public.profiles for delete to authenticated
  using (public.is_super_admin());

-- guilds：可查看者讀取；有編輯權者改名；新增與刪除限總管理員
create policy guilds_select on public.guilds for select to authenticated
  using (public.can_view_guild(id::text));
create policy guilds_insert on public.guilds for insert to authenticated
  with check (public.is_super_admin());
create policy guilds_update on public.guilds for update to authenticated
  using (public.can_edit_guild(id::text))
  with check (public.can_edit_guild(id::text));
create policy guilds_delete on public.guilds for delete to authenticated
  using (public.is_super_admin());

-- guild_members：可查看者讀取；有編輯權者新增／修改／刪除
-- （與網頁一致：自己新增的成員，在可查看的幫會內也能修改與刪除）
create policy members_select on public.guild_members for select to authenticated
  using (public.can_view_guild(guild_id::text));
create policy members_insert on public.guild_members for insert to authenticated
  with check (public.can_edit_guild(guild_id::text));
create policy members_update on public.guild_members for update to authenticated
  using (public.can_edit_guild(guild_id::text)
         or (created_by::text = auth.uid()::text and public.can_view_guild(guild_id::text)))
  with check (public.can_edit_guild(guild_id::text)
              or (created_by::text = auth.uid()::text and public.can_view_guild(guild_id::text)));
create policy members_delete on public.guild_members for delete to authenticated
  using (public.can_edit_guild(guild_id::text)
         or (created_by::text = auth.uid()::text and public.can_view_guild(guild_id::text)));

-- guild_rosters：可查看者讀取；有編輯權者新增／修改／刪除
create policy rosters_select on public.guild_rosters for select to authenticated
  using (public.can_view_guild(guild_id::text));
create policy rosters_insert on public.guild_rosters for insert to authenticated
  with check (public.can_edit_guild(guild_id::text));
create policy rosters_update on public.guild_rosters for update to authenticated
  using (public.can_edit_guild(guild_id::text))
  with check (public.can_edit_guild(guild_id::text));
create policy rosters_delete on public.guild_rosters for delete to authenticated
  using (public.can_edit_guild(guild_id::text));

-- preparation_roles：guild_id 為空＝共用職能（成員頁、排表頁會一併讀取），
-- 規則同技能；有 guild_id 者依該幫會權限
create policy prep_roles_select on public.preparation_roles for select to authenticated
  using (guild_id is null or public.can_view_guild(guild_id::text));
create policy prep_roles_insert on public.preparation_roles for insert to authenticated
  with check (case when guild_id is null then public.has_any_edit_guild()
                   else public.can_edit_guild(guild_id::text) end);
create policy prep_roles_update on public.preparation_roles for update to authenticated
  using (case when guild_id is null then public.has_any_edit_guild()
              else public.can_edit_guild(guild_id::text) end)
  with check (case when guild_id is null then public.has_any_edit_guild()
                   else public.can_edit_guild(guild_id::text) end);
create policy prep_roles_delete on public.preparation_roles for delete to authenticated
  using (case when guild_id is null then public.has_any_edit_guild()
              else public.can_edit_guild(guild_id::text) end);

-- preparation_skills：guild_id 為空＝跨幫會共用技能，登入者皆可讀，
-- 任何幫會的編輯者都可維護；有 guild_id 者依該幫會權限
create policy prep_skills_select on public.preparation_skills for select to authenticated
  using (guild_id is null or public.can_view_guild(guild_id::text));
create policy prep_skills_insert on public.preparation_skills for insert to authenticated
  with check (case when guild_id is null then public.has_any_edit_guild()
                   else public.can_edit_guild(guild_id::text) end);
create policy prep_skills_update on public.preparation_skills for update to authenticated
  using (case when guild_id is null then public.has_any_edit_guild()
              else public.can_edit_guild(guild_id::text) end)
  with check (case when guild_id is null then public.has_any_edit_guild()
                   else public.can_edit_guild(guild_id::text) end);
create policy prep_skills_delete on public.preparation_skills for delete to authenticated
  using (case when guild_id is null then public.has_any_edit_guild()
              else public.can_edit_guild(guild_id::text) end);


-- ---------------------------------------------------------------------
-- 第 3 段：逐表開啟 RLS（每執行一行，就到網站實際操作確認一次）
-- 建議順序如下。未登入的人從此讀不到資料。
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.guilds              enable row level security;
alter table public.guild_members       enable row level security;
alter table public.guild_rosters       enable row level security;
alter table public.preparation_roles   enable row level security;
alter table public.preparation_skills  enable row level security;


-- ---------------------------------------------------------------------
-- 緊急還原：某頁讀不到資料時，對該表執行對應那一行即可立刻恢復原狀
-- ---------------------------------------------------------------------
-- alter table public.profiles            disable row level security;
-- alter table public.guilds              disable row level security;
-- alter table public.guild_members       disable row level security;
-- alter table public.guild_rosters       disable row level security;
-- alter table public.preparation_roles   disable row level security;
-- alter table public.preparation_skills  disable row level security;
-- drop trigger if exists protect_profile_fields on public.profiles;
