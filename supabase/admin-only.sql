-- Apply once to existing installations. No user or catalog data is deleted.
begin;

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.categories enable row level security;
alter table public.cart_items enable row level security;

revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
drop policy if exists "Profiles are readable by their owner" on public.profiles;
-- The existing admin policy allows the role lookup through private.is_admin().
revoke all on public.cart_items from anon, authenticated;
drop policy if exists "Users manage their own cart" on public.cart_items;

revoke all on public.products, public.categories from anon, authenticated;
grant select on public.products, public.categories to anon, authenticated;
grant insert, update, delete on public.products, public.categories to authenticated;
-- Existing INSERT/UPDATE/DELETE policies require private.is_admin().

-- Legacy bucket also needs authorization, even when called outside the UI.
drop policy if exists "Permitir upload de imagens" on storage.objects;
create policy "Admins upload legacy product images"
on storage.objects for insert to authenticated
with check (bucket_id = 'produtos' and (select private.is_admin()));

-- Public signup cannot supply app_metadata. New administrators must be
-- provisioned using the trusted Admin API with app_metadata.role = admin.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if coalesce(new.raw_app_meta_data ->> 'role', '') <> 'admin' then
    raise exception 'Public registration is disabled' using errcode = '42501';
  end if;
  insert into public.profiles (id, display_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', ''), 'admin');
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
commit;
