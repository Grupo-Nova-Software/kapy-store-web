-- ═══════════════════════════════════════════════════════════════════════════
-- Kapy Store · Migración: ÍCONOS de categorías
--
-- Cómo usarla: Supabase Dashboard → SQL Editor → pegar todo → Run.
-- Es idempotente y no borra datos (se puede ejecutar más de una vez).
--
-- categories.icon guarda:
--   · la clave de un ícono incluido en el panel ("shirt", "headphones", …), o
--   · la URL pública de un ícono subido por el admin al bucket product-images
--     (carpeta categories/).
--   · null → la tienda usa un ícono por defecto según el slug.
-- Las subidas usan las mismas políticas de Storage de la Fase 3 (solo admin).
-- ═══════════════════════════════════════════════════════════════════════════

alter table public.categories
  add column if not exists icon text;

alter table public.categories drop constraint if exists categories_icon_check;
alter table public.categories add constraint categories_icon_check check (
  icon is null
  or icon ~ '^[a-z0-9-]{1,40}$'
  or (icon ~ '^https://' and length(icon) <= 500)
);

comment on column public.categories.icon is
  'Ícono del filtro: clave de ícono del panel ("shirt") o URL pública de un ícono subido. null = por defecto.';

-- Íconos para las categorías que ya existen (solo si no tienen uno).
update public.categories set icon = 'footprints' where slug = 'calzados'    and icon is null;
update public.categories set icon = 'headphones' where slug = 'auriculares' and icon is null;
update public.categories set icon = 'watch'      where slug = 'accesorios'  and icon is null;
update public.categories set icon = 'shirt'      where slug = 'ropa'        and icon is null;

-- Que la API vea la columna nueva sin esperar.
notify pgrst, 'reload schema';
