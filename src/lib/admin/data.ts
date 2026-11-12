import "server-only";
import { cache } from "react";
import { requireAdmin } from "@/lib/admin/auth";
import { toCategory, toProduct } from "@/lib/products-service";
import { LOW_STOCK_ALERT, sortSizeStocks } from "@/lib/inventory";
import type { Category, Product } from "@/types/store";

/**
 * Admin reads. Unlike the public catalog these are NOT cached: they run as
 * the logged-in admin (RLS lets them see hidden products) on every request.
 */

export interface AdminCategory extends Category {
  productCount: number;
}

/** One color + size row of the inventory (stock alerts / quick restock). */
export interface StockRow {
  key: string;
  productId: string;
  productName: string;
  variantId: string;
  colorName: string;
  hexColor: string;
  imageUrl: string;
  size: string;
  stock: number;
}

const PRODUCT_SELECT = "*, variants:product_variants(*)" as const;

function fail(what: string, error: { message: string }): never {
  throw new Error(`[admin] No se pudo leer ${what}: ${error.message}`);
}

export const getAdminCategories = cache(async (): Promise<AdminCategory[]> => {
  const { supabase } = await requireAdmin();
  const [cats, prods] = await Promise.all([
    supabase.from("categories").select("*").order("sort_order").order("name"),
    supabase.from("products").select("category_id"),
  ]);
  if (cats.error) fail("las categorías", cats.error);
  if (prods.error) fail("los productos", prods.error);

  const counts = new Map<string, number>();
  for (const p of prods.data) counts.set(p.category_id, (counts.get(p.category_id) ?? 0) + 1);
  return cats.data.map((row) => ({ ...toCategory(row), productCount: counts.get(row.id) ?? 0 }));
});

/** Deduplicated per request (the nav badge and the page both need it). */
export const getAdminProducts = cache(async (): Promise<Product[]> => {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .order("sort_order")
    .order("created_at", { ascending: false });
  if (error) fail("los productos", error);
  return data.map(toProduct);
});

export async function getAdminProduct(id: string): Promise<Product | null> {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", id)
    .maybeSingle();
  // Malformed uuid in the URL → treat as not found.
  if (error?.code === "22P02") return null;
  if (error) fail("el producto", error);
  return data ? toProduct(data) : null;
}

/** Every color + size of every product, flattened. */
export function toStockRows(products: Product[]): StockRow[] {
  return products.flatMap((p) =>
    p.variants.flatMap((v) =>
      sortSizeStocks(v.sizeStocks).map((s) => ({
        key: `${v.id}:${s.size}`,
        productId: p.id,
        productName: p.name,
        variantId: v.id,
        colorName: v.colorName,
        hexColor: v.hexColor,
        imageUrl: v.imageUrl,
        size: s.size,
        stock: s.stock,
      })),
    ),
  );
}

export function isAlert(stock: number): boolean {
  return stock <= LOW_STOCK_ALERT;
}

export interface StockSummary {
  outOfStock: number;
  low: number;
}

export function summarizeStock(rows: StockRow[]): StockSummary {
  let outOfStock = 0;
  let low = 0;
  for (const r of rows) {
    if (r.stock <= 0) outOfStock++;
    else if (r.stock <= LOW_STOCK_ALERT) low++;
  }
  return { outOfStock, low };
}
