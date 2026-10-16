alter table public.products
  add column if not exists sku text,
  add column if not exists price numeric(10, 2),
  add column if not exists promotion_price numeric(10, 2),
  add column if not exists promotion_label text not null default '',
  add column if not exists is_active boolean not null default true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'products_price_nonnegative') then
    alter table public.products
      add constraint products_price_nonnegative check (price is null or price >= 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_promotion_price_valid') then
    alter table public.products
      add constraint products_promotion_price_valid
      check (promotion_price is null or (price is not null and promotion_price >= 0 and promotion_price < price));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_sku_length_valid') then
    alter table public.products
      add constraint products_sku_length_valid check (sku is null or char_length(sku) <= 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'products_promotion_label_length_valid') then
    alter table public.products
      add constraint products_promotion_label_length_valid check (char_length(promotion_label) <= 50);
  end if;
end;
$$;

create index if not exists products_active_category_idx
  on public.products (category, name) where is_active;
