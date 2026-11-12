-- ═══════════════════════════════════════════════════════════════════════════
-- Kapy Store · Esquema de base de datos (Supabase / PostgreSQL)
--
-- Cómo usarlo: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Es idempotente: se puede volver a ejecutar sin duplicar datos.
--
--   categories 1 ── * products 1 ── * product_variants (1 fila por color)
--
-- Inventario granular (Fase 3): cada color guarda su stock POR TALLE en
-- product_variants.size_stocks = [{"size": "40", "stock": 3}, …]. Productos
-- sin talle usan [{"size": "Único", "stock": n}]. La columna `stock` es el
-- total del color y la mantiene un trigger.
--
-- ¿Base existente de la Fase 2? Ejecutá supabase/migrations/20261112_fase3_stock_por_talle.sql
--
-- Seguridad:
--   · Lectura pública (anon + authenticated) del catálogo activo.
--   · Escrituras solo para administradores: usuarios autenticados cuyo
--     app_metadata.role = 'admin' (solo se puede asignar con la service role,
--     el usuario no puede modificarlo). Ver "Crear un admin" al final.
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Helpers ────────────────────────────────────────────────────────────────

create or replace function public.is_admin()
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ─── Tablas ─────────────────────────────────────────────────────────────────

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  slug              text not null unique check (slug ~ '^[a-z0-9-]+$'),
  brand             text not null default '',
  category_id       uuid not null references public.categories (id) on delete restrict,
  description       text not null default '',
  -- Guaraníes: sin decimales.
  price             integer not null check (price >= 0),
  compare_at_price  integer check (compare_at_price is null or compare_at_price >= 0),
  badge             text,
  is_active         boolean not null default true,
  sort_order        integer not null default 0,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references public.products (id) on delete cascade,
  sku             text not null unique,
  color_name      text not null,
  hex_color       text not null check (hex_color ~ '^#[0-9A-Fa-f]{6}$'),
  image_url       text not null,
  -- Fotos extra de la galería (la principal es image_url).
  gallery         text[] not null default '{}',
  -- Stock por talle de este color: [{"size": "40", "stock": 3}, …].
  -- Sin talles (auriculares/accesorios): [{"size": "Único", "stock": n}].
  size_stocks     jsonb not null default '[]'::jsonb,
  -- DERIVADO: suma de size_stocks (trigger product_variants_sync_stock).
  stock           integer not null default 0 check (stock >= 0),
  price_override  integer check (price_override is null or price_override >= 0),
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index if not exists products_category_id_idx on public.products (category_id);
create index if not exists products_active_sort_idx on public.products (is_active, sort_order);
create index if not exists product_variants_product_id_idx on public.product_variants (product_id);

-- Bases creadas antes de la Fase 3 (create table if not exists no agrega columnas).
alter table public.product_variants
  add column if not exists size_stocks jsonb not null default '[]'::jsonb;

-- ─── Stock por talle: validación + total automático ─────────────────────────

create or replace function public.sync_variant_stock()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  invalid_count   integer;
  duplicate_count integer;
begin
  if new.size_stocks is null or jsonb_typeof(new.size_stocks) <> 'array' then
    raise exception 'size_stocks debe ser un array JSON' using errcode = '22023';
  end if;

  select count(*) into invalid_count
  from jsonb_array_elements(new.size_stocks) as e
  where jsonb_typeof(e) is distinct from 'object'
     or jsonb_typeof(e -> 'size') is distinct from 'string'
     or btrim(e ->> 'size') = ''
     or jsonb_typeof(e -> 'stock') is distinct from 'number';
  if invalid_count > 0 then
    raise exception 'Cada talle necesita "size" (texto) y "stock" (número)' using errcode = '22023';
  end if;

  select count(*) into invalid_count
  from jsonb_array_elements(new.size_stocks) as e
  where (e ->> 'stock')::numeric < 0
     or (e ->> 'stock')::numeric <> trunc((e ->> 'stock')::numeric);
  if invalid_count > 0 then
    raise exception 'El stock de cada talle debe ser un entero >= 0' using errcode = '23514';
  end if;

  select count(*) - count(distinct lower(btrim(e ->> 'size'))) into duplicate_count
  from jsonb_array_elements(new.size_stocks) as e;
  if duplicate_count > 0 then
    raise exception 'Hay talles repetidos en el mismo color' using errcode = '23505';
  end if;

  new.stock := coalesce(
    (select sum((e ->> 'stock')::integer) from jsonb_array_elements(new.size_stocks) as e),
    0
  );
  return new;
end;
$$;

drop trigger if exists product_variants_sync_stock on public.product_variants;
create trigger product_variants_sync_stock
  before insert or update of size_stocks on public.product_variants
  for each row execute function public.sync_variant_stock();

-- ─── Sumar / restar stock de un talle (botones + / − del panel) ────────────
-- SECURITY INVOKER: además del chequeo explícito, aplica la RLS de UPDATE.

create or replace function public.adjust_variant_stock(
  p_variant_id uuid,
  p_size       text,
  p_delta      integer
)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  new_stock integer;
begin
  if not public.is_admin() then
    raise exception 'Solo administradores pueden modificar el stock' using errcode = '42501';
  end if;

  update public.product_variants v
  set size_stocks = (
    select jsonb_agg(
             case
               when t.e ->> 'size' = p_size
                 then jsonb_set(t.e, '{stock}', to_jsonb(greatest((t.e ->> 'stock')::integer + p_delta, 0)))
               else t.e
             end
             order by t.ord
           )
    from jsonb_array_elements(v.size_stocks) with ordinality as t(e, ord)
  )
  where v.id = p_variant_id
    and exists (select 1 from jsonb_array_elements(v.size_stocks) as e where e ->> 'size' = p_size);

  if not found then
    raise exception 'No existe ese talle para ese color' using errcode = 'P0002';
  end if;

  select (e ->> 'stock')::integer into new_stock
  from public.product_variants v
  cross join lateral jsonb_array_elements(v.size_stocks) as e
  where v.id = p_variant_id and e ->> 'size' = p_size;

  return new_stock;
end;
$$;

revoke execute on function public.adjust_variant_stock(uuid, text, integer) from public, anon;
grant execute on function public.adjust_variant_stock(uuid, text, integer) to authenticated;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- ─── Permisos + Row Level Security ──────────────────────────────────────────

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_variants to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants to authenticated;

alter table public.categories       enable row level security;
alter table public.products         enable row level security;
alter table public.product_variants enable row level security;

-- Lectura pública
drop policy if exists "categories: lectura pública" on public.categories;
create policy "categories: lectura pública" on public.categories
  for select to anon, authenticated
  using (true);

drop policy if exists "products: lectura pública" on public.products;
create policy "products: lectura pública" on public.products
  for select to anon, authenticated
  using (is_active or public.is_admin());

drop policy if exists "product_variants: lectura pública" on public.product_variants;
create policy "product_variants: lectura pública" on public.product_variants
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id and (p.is_active or public.is_admin())
    )
  );

-- Escrituras: solo admin
drop policy if exists "categories: escritura admin" on public.categories;
create policy "categories: escritura admin" on public.categories
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "products: escritura admin" on public.products;
create policy "products: escritura admin" on public.products
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "product_variants: escritura admin" on public.product_variants;
create policy "product_variants: escritura admin" on public.product_variants
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ─── Storage: bucket público de imágenes ────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images',
  'product-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "product-images: lectura pública" on storage.objects;
create policy "product-images: lectura pública" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'product-images');

drop policy if exists "product-images: subida admin" on storage.objects;
create policy "product-images: subida admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images: edición admin" on storage.objects;
create policy "product-images: edición admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images' and public.is_admin())
  with check (bucket_id = 'product-images' and public.is_admin());

drop policy if exists "product-images: borrado admin" on storage.objects;
create policy "product-images: borrado admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- SEED · Datos iniciales (los 6 productos de la Fase 1)
-- Las fotos apuntan a Unsplash; al subir las propias al bucket, reemplazar
-- image_url / gallery por la URL pública de Storage.
-- ═══════════════════════════════════════════════════════════════════════════

insert into public.categories (name, slug, sort_order) values
  ('Calzados',    'calzados',    1),
  ('Auriculares', 'auriculares', 2),
  ('Accesorios',  'accesorios',  3),
  ('Ropa',        'ropa',        4)
on conflict (slug) do nothing;

insert into public.products
  (slug, name, brand, category_id, description, price, compare_at_price, badge, sort_order)
values
  (
    'retro-high-og', 'Retro High OG ''85', 'Kapy Kicks',
    (select id from public.categories where slug = 'calzados'),
    'La silueta de básquet que se volvió ícono urbano. Capellada de cuero, caña alta acolchada y suela de goma con pivote. Combina con todo.',
    520000, 590000, 'Top ventas',
    1
  ),
  (
    'court-force-low', 'Court Force Low', 'Kapy Kicks',
    (select id from public.categories where slug = 'calzados'),
    'El clásico de la calle. Cuero liso, perfil bajo y amortiguación en el talón para todo el día. Un básico que no puede faltar.',
    450000, null, null,
    2
  ),
  (
    'air-runner-90', 'Air Runner 90', 'Kapy Kicks',
    (select id from public.categories where slug = 'calzados'),
    'Running retro con cámara de aire visible y malla respirable. Liviano, cómodo y con el look noventoso que está de vuelta.',
    480000, null, 'Nuevo',
    3
  ),
  (
    'canvas-hi-classic', 'Canvas Hi Classic', 'Kapy Kicks',
    (select id from public.categories where slug = 'calzados'),
    'Lona resistente, puntera de goma y caña alta. El sneaker de toda la vida, para skate, recitales o el día a día.',
    350000, 390000, null,
    4
  ),
  (
    'kapy-anc-max', 'Kapy ANC Max', 'Kapy Audio',
    (select id from public.categories where slug = 'auriculares'),
    'Auriculares Bluetooth 5.3 over-ear con cancelación activa de ruido, hasta 40 h de batería y carga rápida USB-C. Micrófono para llamadas.',
    390000, 450000, 'Oferta',
    5
  ),
  (
    'kapy-buds-pro', 'Kapy Buds Pro', 'Kapy Audio',
    (select id from public.categories where slug = 'auriculares'),
    'Auriculares in-ear true wireless con estuche de carga, controles táctiles y resistencia al sudor IPX4. Ideales para entrenar.',
    220000, null, null,
    6
  )
on conflict (slug) do nothing;

insert into public.product_variants
  (product_id, sku, color_name, hex_color, image_url, gallery, size_stocks, price_override, sort_order)
select p.id, v.sku, v.color_name, v.hex_color, v.image_url, v.gallery, v.size_stocks, v.price_override, v.sort_order
from (
  values
    -- Retro High OG '85
    ('retro-high-og', 'KK-RHO-CHI', 'Chicago', '#C8102E',
      'https://images.unsplash.com/photo-1597045566677-8cf032ed6634?w=900&q=80&auto=format&fit=crop',
      array[
        'https://images.unsplash.com/photo-1552346154-21d32810aba3?w=900&q=80&auto=format&fit=crop',
        'https://images.unsplash.com/photo-1612902376491-7a8a99b424e8?w=900&q=80&auto=format&fit=crop'
      ], '[{"size":"39","stock":1},{"size":"40","stock":2},{"size":"41","stock":2},{"size":"42","stock":1}]'::jsonb, null::integer, 0),
    ('retro-high-og', 'KK-RHO-TAX', 'Taxi Yellow', '#E5A50A',
      'https://images.unsplash.com/photo-1597248881519-db089d3744a5?w=900&q=80&auto=format&fit=crop',
      '{}'::text[], '[{"size":"40","stock":1},{"size":"41","stock":0},{"size":"42","stock":2}]', null, 1),
    ('retro-high-og', 'KK-RHO-SHB', 'Shattered Black', '#18181B',
      'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"41","stock":0},{"size":"42","stock":0}]', null, 2),
    -- Court Force Low
    ('court-force-low', 'KK-CFL-WHT', 'Triple White', '#F4F4F5',
      'https://images.unsplash.com/photo-1600269452121-4f2416e55c28?w=900&q=80&auto=format&fit=crop',
      array['https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=900&q=80&auto=format&fit=crop'],
      '[{"size":"38","stock":2},{"size":"39","stock":3},{"size":"40","stock":3},{"size":"41","stock":2},{"size":"42","stock":2}]', null, 0),
    ('court-force-low', 'KK-CFL-BLK', 'Triple Black', '#09090B',
      'https://images.unsplash.com/photo-1543508282-6319a3e2621f?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"40","stock":2},{"size":"42","stock":2},{"size":"44","stock":1}]', null, 1),
    ('court-force-low', 'KK-CFL-PST', 'Pastel Pack', '#C4B5FD',
      'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"37","stock":1},{"size":"38","stock":1}]', 480000, 2),
    -- Air Runner 90
    ('air-runner-90', 'KK-AR90-RYL', 'Royal Blue', '#2563EB',
      'https://images.unsplash.com/photo-1515955656352-a1fa3ffcd111?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"40","stock":2},{"size":"41","stock":2}]', null, 0),
    ('air-runner-90', 'KK-AR90-INF', 'Infrared', '#F97316',
      'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"39","stock":2},{"size":"40","stock":3},{"size":"43","stock":2}]', null, 1),
    ('air-runner-90', 'KK-AR90-VLT', 'Volt', '#A3E635',
      'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"40","stock":1}]', null, 2),
    -- Canvas Hi Classic
    ('canvas-hi-classic', 'KK-CHI-RED', 'Rojo Sneaker', '#DC2626',
      'https://images.unsplash.com/photo-1607522370275-f14206abe5d3?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"37","stock":2},{"size":"38","stock":2},{"size":"39","stock":3},{"size":"40","stock":2}]', null, 0),
    ('canvas-hi-classic', 'KK-CHI-SPL', 'Split Black/Red', '#27272A',
      'https://images.unsplash.com/photo-1617606002779-51d866bdd1d1?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"41","stock":2},{"size":"42","stock":1}]', null, 1),
    -- Kapy ANC Max
    ('kapy-anc-max', 'KA-ANC-BLK', 'Negro Mate', '#1C1917',
      'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=900&q=80&auto=format&fit=crop',
      array['https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=900&q=80&auto=format&fit=crop'],
      '[{"size":"Único","stock":8}]', null, 0),
    ('kapy-anc-max', 'KA-ANC-PNK', 'Rosa Pastel', '#F9A8D4',
      'https://images.unsplash.com/photo-1613040809024-b4ef7ba99bc3?w=900&q=80&auto=format&fit=crop',
      '{}', '[{"size":"Único","stock":2}]', 420000, 1),
    -- Kapy Buds Pro
    ('kapy-buds-pro', 'KA-BUD-WHT', 'Blanco', '#FAFAFA',
      'https://images.unsplash.com/photo-1588423771073-b8903fbb85b5?w=900&q=80&auto=format&fit=crop',
      array['https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=900&q=80&auto=format&fit=crop'],
      '[{"size":"Único","stock":15}]', null, 0)
) as v (product_slug, sku, color_name, hex_color, image_url, gallery, size_stocks, price_override, sort_order)
join public.products p on p.slug = v.product_slug
on conflict (sku) do nothing;

-- ═══════════════════════════════════════════════════════════════════════════
-- Crear / promover el primer admin (panel /admin)
--
-- El rol vive en app_metadata (solo editable con la service role: el usuario
-- no puede auto-asignárselo). public.is_admin() lo lee desde el JWT.
--
-- 1. Supabase Dashboard → Authentication → Users → "Add user" → "Create new
--    user": email + contraseña, marcar "Auto Confirm User".
--    Recomendado: Authentication → Sign In / Providers → desactivar
--    "Allow new users to sign up" (la tienda no tiene registro público).
--
-- 2. SQL Editor → ejecutar, reemplazando el email:
--
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
--   where email = 'dueño@ejemplo.com';
--
-- 3. Verificar:
--
--   select email, raw_app_meta_data ->> 'role' as role from auth.users;
--
-- 4. Entrar a /admin/login. Si la sesión ya estaba abierta antes del paso 2,
--    cerrá sesión y volvé a entrar (el rol viaja dentro del JWT).
--
-- Quitar el permiso:
--   update auth.users set raw_app_meta_data = raw_app_meta_data - 'role'
--   where email = 'dueño@ejemplo.com';
-- ═══════════════════════════════════════════════════════════════════════════
