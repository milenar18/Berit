begin;
alter table public.profiles add column if not exists must_change_password boolean not null default false;
create or replace function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and not must_change_password);
$$;
revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;
-- Pending administrators can read their own status, but cannot change it.
drop policy if exists "Profiles are readable by their owner" on public.profiles;
create policy "Profiles are readable by their owner" on public.profiles for select to authenticated using ((select auth.uid()) = id);
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'role', '') <> 'admin' then
    raise exception 'Public registration is disabled' using errcode = '42501';
  end if;
  insert into public.profiles (id, display_name, role, must_change_password)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), 'admin', true);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
-- Only an actual Auth password update releases the pending account.
create or replace function private.complete_first_password() returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.encrypted_password is distinct from new.encrypted_password and coalesce(new.encrypted_password, '') <> '' then
    update public.profiles set must_change_password = false where id = new.id and must_change_password;
  end if;
  return new;
end;
$$;
revoke all on function private.complete_first_password() from public, anon, authenticated;
drop trigger if exists on_admin_password_changed on auth.users;
create trigger on_admin_password_changed after update of encrypted_password on auth.users for each row execute function private.complete_first_password();
commit;
