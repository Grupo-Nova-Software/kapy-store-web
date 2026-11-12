-- ═══════════════════════════════════════════════════════════════════════════
-- Kapy Store · Migración Fase 3: stock por COLOR + TALLE
--
-- Para una base que ya tiene aplicado el esquema de la Fase 2.
-- Cómo usarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Es idempotente y no borra datos (se puede ejecutar más de una vez).
--
-- Qué cambia:
--   · product_variants.size_stocks jsonb: [{ "size": "40", "stock": 3 }, …]
--     Productos sin talle (auriculares, accesorios) → [{ "size": "Único", … }].
--   · product_variants.stock pasa a ser DERIVADO: lo mantiene un trigger con la
--     suma de size_stocks (sirve para ordenar/filtrar rápido sin abrir el JSON).
--   · products.sizes queda obsoleta (ya no la usa la app). No se borra.
--   · RPC adjust_variant_stock(variant, talle, delta): suma/resta stock de un
--     talle de forma atómica (botones + / − del panel).
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── 1. Columna nueva ───────────────────────────────────────────────────────

alter table public.product_variants
  add column if not exists size_stocks jsonb not null default '[]'::jsonb;

comment on column public.product_variants.size_stocks is
  'Stock por talle de este color: [{"size": "40", "stock": 3}]. Sin talles → [{"size": "Único", "stock": n}].';
comment on column public.product_variants.stock is
  'DERIVADO (trigger product_variants_sync_stock): suma de size_stocks[].stock. No escribir a mano.';

-- ─── 2. Validación + stock total automático ─────────────────────────────────

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

-- ─── 3. Backfill desde el modelo anterior (stock por color + products.sizes) ─
-- El stock de cada color se reparte entre sus talles (ej. 5 en 39/40/41 →
-- 2/2/1). Revisá y ajustá los números reales desde /admin → Alertas Stock.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'products' and column_name = 'sizes'
  ) then
    update public.product_variants v
    set size_stocks = coalesce(
      (
        select jsonb_agg(
                 jsonb_build_object(
                   'size', s.size,
                   'stock', v.stock / cardinality(p.sizes)
                            + case when s.ord <= v.stock % cardinality(p.sizes) then 1 else 0 end
                 )
                 order by s.ord
               )
        from public.products p
        cross join lateral unnest(p.sizes) with ordinality as s(size, ord)
        where p.id = v.product_id
      ),
      jsonb_build_array(jsonb_build_object('size', 'Único', 'stock', v.stock))
    )
    where v.size_stocks = '[]'::jsonb;

    comment on column public.products.sizes is
      'OBSOLETA desde la Fase 3: los talles viven en product_variants.size_stocks.';
  else
    update public.product_variants v
    set size_stocks = jsonb_build_array(jsonb_build_object('size', 'Único', 'stock', v.stock))
    where v.size_stocks = '[]'::jsonb;
  end if;
end;
$$;

-- ─── 4. RPC: sumar / restar stock de un talle (atómico) ─────────────────────
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

-- ─── 5. Permisos (se re-declaran por si la base vino de una versión previa) ──
-- Lectura pública del catálogo; escritura solo para admin (app_metadata.role).

grant select on public.categories, public.products, public.product_variants to anon, authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants to authenticated;

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

-- Storage: el panel sube fotos .webp comprimidas al bucket product-images.
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

-- ─── 6. Primer administrador ────────────────────────────────────────────────
-- Ver el bloque "Crear / promover el primer admin" al final de supabase-schema.sql.
