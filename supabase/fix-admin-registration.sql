-- Auth Admin API applies app_metadata after inserting the user in the same transaction.
-- Validate the final row at commit, while still rejecting public registration.
begin;
create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$
declare account auth.users%rowtype;
begin
  select * into account from auth.users where id = new.id;
  if not found then return new; end if;
  if coalesce(account.raw_app_meta_data ->> 'role', '') <> 'admin' then
    raise exception 'Public registration is disabled' using errcode = '42501';
  end if;
  insert into public.profiles (id, display_name, role, must_change_password)
  values (account.id, coalesce(account.raw_user_meta_data ->> 'name', ''), 'admin', true);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
drop trigger if exists on_auth_user_created on auth.users;
create constraint trigger on_auth_user_created after insert on auth.users deferrable initially deferred for each row execute function private.handle_new_user();
commit;
