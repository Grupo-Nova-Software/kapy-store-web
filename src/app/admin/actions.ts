"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin, type AdminSession } from "@/lib/admin/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasAdminRole } from "@/lib/admin/roles";
import { CATALOG_TAG } from "@/lib/products-service";
import { isOneSizeLabel, ONE_SIZE_LABEL, sortSizeStocks } from "@/lib/inventory";
import { productImagesPublicPrefix, PRODUCT_IMAGES_BUCKET } from "@/lib/supabase/env";
import { randomSuffix, slugify } from "@/lib/slug";
import type { ActionResult, ColorInput, ProductInput } from "@/lib/admin/types";
import type { SizeStock } from "@/types/store";
import { isCategoryIconKey } from "@/lib/category-icons";

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface DbError {
  message: string;
  code?: string;
}

/** Postgres / PostgREST error → message the owner can act on. */
function friendly(error: DbError, fallback: string): string {
  switch (error.code) {
    case "42501":
      return "Tu usuario no tiene permisos de administrador.";
    case "23503":
      return "No se puede borrar: todavía hay productos que la usan.";
    case "23505":
      return "Ya existe un registro con ese nombre o código.";
    case "23514":
    case "22023":
      return `Datos inválidos: ${error.message}`;
    default:
      return `${fallback} (${error.message})`;
  }
}

/** The public store reads a cached catalog: expire it after every write. */
function catalogChanged() {
  updateTag(CATALOG_TAG);
}

const HEX = /^#[0-9a-f]{6}$/i;

function cleanText(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanInt(value: unknown): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Bucket path of a public URL we own, or null for external URLs (Unsplash…). */
function storagePath(url: string): string | null {
  const prefix = productImagesPublicPrefix();
  return url.startsWith(prefix) ? decodeURIComponent(url.slice(prefix.length)) : null;
}

async function removeImages(session: AdminSession, urls: Iterable<string>) {
  const paths = [...new Set([...urls].map(storagePath).filter((p): p is string => p !== null))];
  if (paths.length === 0) return;
  // Best effort: an orphan file is harmless, a failed save is not.
  const { error } = await session.supabase.storage.from(PRODUCT_IMAGES_BUCKET).remove(paths);
  if (error) console.warn("[admin] No se pudieron borrar imágenes viejas:", error.message);
}

async function uniqueSlug(
  session: AdminSession,
  table: "products" | "categories",
  base: string,
): Promise<string> {
  const slug = base || "item";
  const { data } = await session.supabase.from(table).select("id").eq("slug", slug).maybeSingle();
  return data ? `${slug}-${randomSuffix()}` : slug;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface LoginState {
  error: string | null;
  email: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = cleanText(formData.get("email"), 200).toLowerCase();
  const rawPassword = formData.get("password");
  const password = typeof rawPassword === "string" ? rawPassword : "";
  if (!email || !password) return { error: "Ingresá tu email y contraseña.", email };

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    const message =
      error.code === "invalid_credentials"
        ? "Email o contraseña incorrectos."
        : error.code === "email_not_confirmed"
          ? "Confirmá tu email antes de entrar."
          : `No pudimos iniciar sesión (${error.message}).`;
    return { error: message, email };
  }
  if (!hasAdminRole(data.user.app_metadata)) {
    await supabase.auth.signOut();
    return { error: "Esta cuenta no tiene permisos de administrador.", email };
  }
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}

// ─── Categories ──────────────────────────────────────────────────────────────

/**
 * A category icon is a built-in key ("shirt") or an icon the admin uploaded to
 * our bucket (`categories/…`). Anything else is rejected.
 */
function cleanIcon(value: unknown): { ok: true; icon: string | null } | { ok: false } {
  if (value === null || value === undefined || value === "") return { ok: true, icon: null };
  if (typeof value !== "string" || value.length > 500) return { ok: false };
  if (isCategoryIconKey(value)) return { ok: true, icon: value };
  const path = storagePath(value);
  return path?.startsWith("categories/") ? { ok: true, icon: value } : { ok: false };
}

/** DB without the icons migration → PostgREST "column not found". */
const missingIconColumn = (error: DbError) => error.code === "PGRST204" || /\bicon\b/.test(error.message);
const ICON_MIGRATION_HINT =
  "Falta la columna de íconos: ejecutá supabase/migrations/20261113_categorias_iconos.sql en Supabase.";

export async function createCategory(name: string, icon: string | null = null): Promise<ActionResult> {
  const session = await requireAdmin();
  const clean = cleanText(name, 60);
  if (!clean) return { ok: false, error: "Escribí un nombre para la categoría." };
  const iconCheck = cleanIcon(icon);
  if (!iconCheck.ok) return { ok: false, error: "Ícono inválido." };

  const { data: last } = await session.supabase
    .from("categories")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await session.supabase.from("categories").insert({
    name: clean,
    slug: await uniqueSlug(session, "categories", slugify(clean)),
    sort_order: (last?.sort_order ?? 0) + 1,
    ...(iconCheck.icon ? { icon: iconCheck.icon } : {}),
  });
  if (error) {
    if (iconCheck.icon && missingIconColumn(error)) return { ok: false, error: ICON_MIGRATION_HINT };
    return { ok: false, error: friendly(error, "No se pudo crear la categoría") };
  }

  catalogChanged();
  refresh();
  return { ok: true };
}

/** Renames only: the slug stays stable (store filters and icons depend on it). */
export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const clean = cleanText(name, 60);
  if (!clean) return { ok: false, error: "El nombre no puede quedar vacío." };

  const { error } = await session.supabase.from("categories").update({ name: clean }).eq("id", id);
  if (error) return { ok: false, error: friendly(error, "No se pudo renombrar") };

  catalogChanged();
  refresh();
  return { ok: true };
}

export async function setCategoryIcon(id: string, icon: string | null): Promise<ActionResult> {
  const session = await requireAdmin();
  const iconCheck = cleanIcon(icon);
  if (!iconCheck.ok) return { ok: false, error: "Ícono inválido." };

  const { data: current } = await session.supabase.from("categories").select("icon").eq("id", id).maybeSingle();
  const { error } = await session.supabase.from("categories").update({ icon: iconCheck.icon }).eq("id", id);
  if (error) {
    if (missingIconColumn(error)) return { ok: false, error: ICON_MIGRATION_HINT };
    return { ok: false, error: friendly(error, "No se pudo cambiar el ícono") };
  }
  // The previous uploaded icon is no longer used.
  if (current?.icon && current.icon !== iconCheck.icon) await removeImages(session, [current.icon]);

  catalogChanged();
  refresh();
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  const session = await requireAdmin();

  const { count } = await session.supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("category_id", id);
  if (count) {
    return {
      ok: false,
      error: `Tiene ${count} ${count === 1 ? "producto" : "productos"}. Movelos a otra categoría o borralos primero.`,
    };
  }

  const { data: deleted, error } = await session.supabase.from("categories").delete().eq("id", id).select("*");
  if (error) return { ok: false, error: friendly(error, "No se pudo borrar la categoría") };
  const uploadedIcons = (deleted ?? []).flatMap((row) => (row.icon ? [row.icon] : []));
  await removeImages(session, uploadedIcons);

  catalogChanged();
  refresh();
  return { ok: true };
}

// ─── Products ────────────────────────────────────────────────────────────────

function validateSizes(raw: unknown): SizeStock[] | string {
  if (!Array.isArray(raw) || raw.length === 0) {
    return "necesita al menos un talle (o “Talle único”).";
  }
  const seen = new Set<string>();
  const out: SizeStock[] = [];
  for (const entry of raw as Partial<SizeStock>[]) {
    const size = cleanText(entry?.size, 12);
    const stock = cleanInt(entry?.stock);
    if (!size) return "hay un talle sin nombre.";
    if (stock === null || stock < 0 || stock > 100_000) return `el stock del talle ${size} no es válido.`;
    const key = size.toLowerCase();
    if (seen.has(key)) return `el talle ${size} está repetido.`;
    seen.add(key);
    out.push({ size: isOneSizeLabel(size) ? ONE_SIZE_LABEL : size, stock });
  }
  if (out.length > 1 && out.some((s) => s.size === ONE_SIZE_LABEL)) {
    return "“Talle único” no se puede combinar con otros talles.";
  }
  return sortSizeStocks(out);
}

type ValidProduct = Omit<ProductInput, "colors"> & { colors: ColorInput[] };

function validateProduct(input: ProductInput): ValidProduct | string {
  const name = cleanText(input.name, 120);
  if (!name) return "El producto necesita un nombre.";
  const price = cleanInt(input.price);
  if (price === null || price <= 0) return "Ingresá un precio válido en Guaraníes.";
  const compareAt = cleanInt(input.compareAtPrice);
  if (compareAt !== null && compareAt <= price) {
    return "El “precio anterior” debe ser mayor al precio actual (o dejalo vacío).";
  }
  if (!input.categoryId) return "Elegí una categoría.";
  if (!Array.isArray(input.colors) || input.colors.length === 0) return "Agregá al menos un color.";

  const colors: ColorInput[] = [];
  const names = new Set<string>();
  for (const [i, c] of input.colors.entries()) {
    const colorName = cleanText(c.colorName, 40);
    if (!colorName) return `Color ${i + 1}: falta el nombre del color.`;
    if (names.has(colorName.toLowerCase())) return `El color “${colorName}” está repetido.`;
    names.add(colorName.toLowerCase());
    if (!HEX.test(c.hexColor)) return `${colorName}: el tono elegido no es válido.`;
    if (!c.imageUrl || !/^https:\/\//.test(c.imageUrl)) return `${colorName}: subí una foto.`;
    const sizeStocks = validateSizes(c.sizeStocks);
    if (typeof sizeStocks === "string") return `${colorName}: ${sizeStocks}`;
    colors.push({ id: c.id, colorName, hexColor: c.hexColor.toUpperCase(), imageUrl: c.imageUrl, sizeStocks });
  }

  return {
    id: input.id,
    name,
    brand: cleanText(input.brand, 60),
    description: cleanText(input.description, 2000),
    price,
    compareAtPrice: compareAt,
    categoryId: input.categoryId,
    badge: cleanText(input.badge, 24) || null,
    isActive: Boolean(input.isActive),
    colors,
  };
}

function skuFor(productName: string, colorName: string): string {
  const initials =
    slugify(productName)
      .split("-")
      .filter(Boolean)
      .map((w) => w[0])
      .join("")
      .slice(0, 4)
      .toUpperCase() || "X";
  const color = slugify(colorName).replace(/-/g, "").slice(0, 3).toUpperCase() || "COL";
  return `KP-${initials}-${color}-${randomSuffix().toUpperCase()}`;
}

export async function saveProduct(input: ProductInput): Promise<ActionResult<{ id: string }>> {
  const session = await requireAdmin();
  const valid = validateProduct(input);
  if (typeof valid === "string") return { ok: false, error: valid };
  const { supabase } = session;

  const productFields = {
    name: valid.name,
    brand: valid.brand,
    description: valid.description,
    price: valid.price,
    compare_at_price: valid.compareAtPrice,
    category_id: valid.categoryId,
    badge: valid.badge,
    is_active: valid.isActive,
  };

  // 1. Product row
  let productId = valid.id;
  if (productId) {
    const { error } = await supabase.from("products").update(productFields).eq("id", productId);
    if (error) return { ok: false, error: friendly(error, "No se pudo guardar el producto") };
  } else {
    const { data, error } = await supabase
      .from("products")
      .insert({ ...productFields, slug: await uniqueSlug(session, "products", slugify(valid.name)) })
      .select("id")
      .single();
    if (error) return { ok: false, error: friendly(error, "No se pudo crear el producto") };
    productId = data.id;
  }

  // 2. Colors: update kept ones, insert new ones, then delete removed ones
  //    (in that order, so a failure never leaves the product without colors).
  const { data: existing, error: existingError } = await supabase
    .from("product_variants")
    .select("id, image_url, gallery")
    .eq("product_id", productId);
  if (existingError) {
    return { ok: false, error: friendly(existingError, "No se pudieron leer los colores") };
  }

  const existingById = new Map(existing.map((v) => [v.id, v]));
  const ordered = valid.colors.map((c, sortOrder) => ({ c, sortOrder }));
  const kept = ordered.filter(({ c }) => c.id !== undefined && existingById.has(c.id));
  const added = ordered.filter(({ c }) => c.id === undefined || !existingById.has(c.id));
  const keptIds = new Set(kept.map(({ c }) => c.id!));
  const replacedImages = kept
    .map(({ c }) => existingById.get(c.id!)!.image_url)
    .filter((url, i) => url !== kept[i].c.imageUrl);

  const results = await Promise.all(
    kept.map(({ c, sortOrder }) =>
      supabase
        .from("product_variants")
        .update({
          color_name: c.colorName,
          hex_color: c.hexColor,
          image_url: c.imageUrl,
          size_stocks: c.sizeStocks,
          sort_order: sortOrder,
        })
        .eq("id", c.id!),
    ),
  );
  const updateError = results.find((r) => r.error)?.error;
  if (updateError) return { ok: false, error: friendly(updateError, "No se pudo guardar un color") };

  if (added.length > 0) {
    const { error } = await supabase.from("product_variants").insert(
      added.map(({ c, sortOrder }) => ({
        product_id: productId,
        sku: skuFor(valid.name, c.colorName),
        color_name: c.colorName,
        hex_color: c.hexColor,
        image_url: c.imageUrl,
        size_stocks: c.sizeStocks,
        sort_order: sortOrder,
      })),
    );
    if (error) return { ok: false, error: friendly(error, "No se pudo agregar un color") };
  }

  const removed = existing.filter((v) => !keptIds.has(v.id));
  if (removed.length > 0) {
    const { error } = await supabase
      .from("product_variants")
      .delete()
      .in(
        "id",
        removed.map((v) => v.id),
      );
    if (error) return { ok: false, error: friendly(error, "No se pudo quitar un color") };
  }

  await removeImages(session, [
    ...replacedImages,
    ...removed.flatMap((v) => [v.image_url, ...(v.gallery ?? [])]),
  ]);

  catalogChanged();
  refresh();
  return { ok: true, data: { id: productId } };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  const session = await requireAdmin();
  const { data: variants } = await session.supabase
    .from("product_variants")
    .select("image_url, gallery")
    .eq("product_id", id);

  const { error } = await session.supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, error: friendly(error, "No se pudo borrar el producto") };

  await removeImages(
    session,
    (variants ?? []).flatMap((v) => [v.image_url, ...(v.gallery ?? [])]),
  );
  catalogChanged();
  refresh();
  return { ok: true };
}

/** Quick show / hide from the product list. */
export async function setProductActive(id: string, isActive: boolean): Promise<ActionResult> {
  const session = await requireAdmin();
  const { error } = await session.supabase
    .from("products")
    .update({ is_active: isActive })
    .eq("id", id);
  if (error) return { ok: false, error: friendly(error, "No se pudo actualizar") };
  catalogChanged();
  refresh();
  return { ok: true };
}

// ─── Stock ───────────────────────────────────────────────────────────────────

/** +/− on one color + size. Atomic in the DB; returns the new stock. */
export async function adjustStock(
  variantId: string,
  size: string,
  delta: number,
): Promise<ActionResult<{ stock: number }>> {
  const session = await requireAdmin();
  const step = cleanInt(delta);
  if (!step || Math.abs(step) > 1000) return { ok: false, error: "Cantidad inválida." };

  const { data, error } = await session.supabase.rpc("adjust_variant_stock", {
    p_variant_id: variantId,
    p_size: size,
    p_delta: step,
  });
  if (error) return { ok: false, error: friendly(error, "No se pudo actualizar el stock") };

  // refresh() keeps the nav alert badge current; the stock screen keeps its
  // rows in local state, so a row that leaves the alert range stays visible.
  catalogChanged();
  refresh();
  return { ok: true, data: { stock: data } };
}
