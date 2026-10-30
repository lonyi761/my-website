-- =====================================================================
-- 資安第 2 步：停權、試用到期在資料庫層生效；總管理員可真正刪除帳號
-- 需先完成 security-step1.sql。可整份一次執行（不含開關 RLS）。
-- =====================================================================

-- 帳號是否可用：未停權，且為總管理員或尚未到期
create or replace function public.is_active_user()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and coalesce(p.status, '') <> '已停權'
      and (p.role = 'super_admin' or p.expire_at is null or p.expire_at > now())
  );
$$;

-- 以下權限函式改為：帳號不可用時一律視為無權限
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from profiles p
    where p.id = auth.uid() and p.role = 'super_admin'
  );
$$;

create or replace function public.can_view_guild(gid text)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
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
  select public.is_active_user() and exists (
    select 1 from profiles p
    where p.id = auth.uid() and (
      p.role = 'super_admin'
      or coalesce(to_jsonb(p.edit_guild_ids), '[]'::jsonb) ? gid
    )
  );
$$;

create or replace function public.has_any_edit_guild()
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_active_user() and exists (
    select 1 from profiles p
    where p.id = auth.uid() and (
      p.role = 'super_admin'
      or jsonb_array_length(coalesce(to_jsonb(p.edit_guild_ids), '[]'::jsonb)) > 0
    )
  );
$$;

-- 共用職能、技能：停權或到期的帳號也不能讀
drop policy if exists prep_roles_select on public.preparation_roles;
create policy prep_roles_select on public.preparation_roles for select to authenticated
  using ((guild_id is null and public.is_active_user()) or public.can_view_guild(guild_id::text));

drop policy if exists prep_skills_select on public.preparation_skills;
create policy prep_skills_select on public.preparation_skills for select to authenticated
  using ((guild_id is null and public.is_active_user()) or public.can_view_guild(guild_id::text));

-- 總管理員刪除帳號：刪除登入帳號本身（profiles 會隨之刪除），
-- 被刪除的人無法再登入，也不會被重建為新試用帳號
create or replace function public.admin_delete_user(target uuid)
returns void language plpgsql security definer set search_path = public, auth as $$
begin
  if not public.is_super_admin() then
    raise exception '只有總管理員可以刪除帳號';
  end if;
  if target = auth.uid() then
    raise exception '不能刪除自己的帳號';
  end if;
  delete from auth.users where id = target;
end;
$$;

revoke all on function public.admin_delete_user(uuid) from public, anon;
grant execute on function public.admin_delete_user(uuid) to authenticated;
