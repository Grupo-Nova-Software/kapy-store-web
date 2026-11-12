import { cacheLife, cacheTag } from "next/cache";
import { getSupabase } from "@/lib/supabase";
import type { CategoryRow, ProductRow, ProductVariantRow } from "@/types/database";
import type { Category, Product, ProductVariant } from "@/types/store";

/**
 * Data access layer — reads the catalog from Supabase.
 *
 * Results are cached for a minute (`cacheLife("minutes")`) and tagged
 * `catalog`, so the future /admin panel can refresh the store instantly
 * after saving with `updateTag(CATALOG_TAG)`.
 */

export const CATALOG_TAG = "catalog";

export interface Catalog {
  products: Product[];
  categories: Category[];
}

// ─── Row → domain mappers ────────────────────────────────────────────────────

function toCategory(row: CategoryRow): Category {
  return { id: row.id, slug: row.slug, name: row.name, sortOrder: row.sort_order };
}

function toVariant(row: ProductVariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    colorName: row.color_name,
    hexColor: row.hex_color,
    imageUrl: row.image_url,
    gallery: row.gallery ?? [],
    stock: row.stock,
    priceOverride: row.price_override,
    sortOrder: row.sort_order,
  };
}

function toProduct(row: ProductRow & { variants: ProductVariantRow[] }): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    description: row.description,
    categoryId: row.category_id,
    price: row.price,
    compareAtPrice: row.compare_at_price,
    badge: row.badge,
    sizes: row.sizes ?? [],
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    variants: row.variants
      .map(toVariant)
      .sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

class CatalogError extends Error {
  constructor(what: string, cause: { message: string; code?: string }) {
    super(`[catalog] Error al leer ${what} desde Supabase: ${cause.message} (${cause.code ?? "?"})`);
    this.name = "CatalogError";
  }
}

// ─── Queries ─────────────────────────────────────────────────────────────────

const PRODUCT_SELECT = "*, variants:product_variants(*)" as const;

export async function getCategories(): Promise<Category[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const { data, error } = await getSupabase()
    .from("categories")
    .select("*")
    .order("sort_order");
  if (error) throw new CatalogError("las categorías", error);
  return data.map(toCategory);
}

export async function getProducts(): Promise<Product[]> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const { data, error } = await getSupabase()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("is_active", true)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) throw new CatalogError("los productos", error);
  return data
    .map(toProduct)
    // A product without colors can't be bought; hide it until it's completed.
    .filter((p) => p.variants.length > 0);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  "use cache";
  cacheLife("minutes");
  cacheTag(CATALOG_TAG);

  const { data, error } = await getSupabase()
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();
  if (error) throw new CatalogError(`el producto "${slug}"`, error);
  return data ? toProduct(data) : null;
}

export async function getCatalog(): Promise<Catalog> {
  const [products, categories] = await Promise.all([getProducts(), getCategories()]);
  return { products, categories };
}
