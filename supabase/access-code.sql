-- Run this once in Supabase: SQL Editor > New query.
-- Before running, replace __YOUR_PRIVATE_CODE__ with your private access code.
create extension if not exists pgcrypto;

create table if not exists public.cms_admin_settings (
  id boolean primary key default true check (id),
  password_hash text not null
);

insert into public.cms_admin_settings (id, password_hash)
values (true, crypt('__YOUR_PRIVATE_CODE__', gen_salt('bf')))
on conflict (id) do update set password_hash = excluded.password_hash;

create or replace function public.admin_login(p_password text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  return exists (
    select 1 from public.cms_admin_settings
    where id = true and password_hash = crypt(p_password, password_hash)
  );
end;
$$;

create or replace function public.save_site_content(p_password text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  if not public.admin_login(p_password) then
    raise exception 'Неверный код доступа' using errcode = '28000';
  end if;

  insert into public.site_content (id, payload, updated_at)
  values ('main', p_payload, now())
  on conflict (id) do update set payload = excluded.payload, updated_at = excluded.updated_at;
end;
$$;

revoke all on public.cms_admin_settings from anon, authenticated;
grant execute on function public.admin_login(text) to anon, authenticated;
grant execute on function public.save_site_content(text, jsonb) to anon, authenticated;
