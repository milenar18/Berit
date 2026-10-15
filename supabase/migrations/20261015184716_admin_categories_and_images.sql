create table if not exists public.categories (
  name text primary key check (char_length(name) between 1 and 50),
  note text not null default '' check (char_length(note) <= 160),
  image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.categories (name, note)
values
  ('Canecas', 'Um café com mais carinho'),
  ('Garrafas', 'Para acompanhar seu dia'),
  ('Chaveiros', 'Leve uma lembrança com você'),
  ('Relógios', 'O tempo dos bons momentos'),
  ('Quebra-cabeças', 'Diversão em cada peça'),
  ('Presentes', 'Ideias para surpreender')
on conflict (name) do nothing;

insert into public.categories (name)
select distinct category from public.products
on conflict (name) do nothing;

alter table public.products
  add constraint products_category_fkey
  foreign key (category) references public.categories(name)
  on update cascade on delete restrict;

create index if not exists categories_created_at_idx on public.categories (created_at);

alter table public.categories enable row level security;
grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;

create policy "Categories are publicly readable"
  on public.categories for select to anon, authenticated using (true);
create policy "Admins can create categories"
  on public.categories for insert to authenticated
  with check ((select private.is_admin()));
create policy "Admins can update categories"
  on public.categories for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "Admins can delete categories"
  on public.categories for delete to authenticated
  using ((select private.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('category-images', 'category-images', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Category images are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'category-images');
create policy "Admins upload category images"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'category-images' and (select private.is_admin()));
create policy "Admins update category images"
  on storage.objects for update to authenticated
  using (bucket_id = 'category-images' and (select private.is_admin()))
  with check (bucket_id = 'category-images' and (select private.is_admin()));
create policy "Admins delete category images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'category-images' and (select private.is_admin()));
