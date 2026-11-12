import type { Product, ProductVariant, SizeStock } from "@/types/store";

/**
 * Inventory helpers for the color + size model.
 *
 * Every color (`ProductVariant`) lists the sizes it is offered in, each with
 * its own stock. Products without sizes (headphones, accessories) store a
 * single `"Único"` entry. Shared by the public catalog and the admin panel.
 */

export const ONE_SIZE_LABEL = "Único";

/** Admin alert threshold: a color + size with this many units or fewer. */
export const LOW_STOCK_ALERT = 2;

export function isOneSizeLabel(size: string): boolean {
  return size.trim().toLowerCase() === ONE_SIZE_LABEL.toLowerCase();
}

/** A color sold without sizes: a single "Único" entry (or nothing configured). */
export function isOneSizeVariant(variant: Pick<ProductVariant, "sizeStocks">): boolean {
  const { sizeStocks } = variant;
  return sizeStocks.length === 0 || (sizeStocks.length === 1 && isOneSizeLabel(sizeStocks[0].size));
}

/** True when at least one color is sold by size (shoes, clothes). */
export function productHasSizes(product: Product): boolean {
  return product.variants.some((v) => !isOneSizeVariant(v));
}

export function sizeStockOf(variant: ProductVariant, size: string | null): number {
  if (size === null) return 0;
  return variant.sizeStocks.find((s) => s.size === size)?.stock ?? 0;
}

export function isProductSoldOut(product: Product): boolean {
  return product.variants.every((v) => v.stock <= 0);
}

// ─── Size ordering ───────────────────────────────────────────────────────────

const LETTER_SIZES = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "3XL", "4XL"];

function sizeRank(size: string): [number, number, string] {
  const s = size.trim().toUpperCase();
  const n = Number(s.replace(",", "."));
  if (Number.isFinite(n)) return [0, n, s];
  const letter = LETTER_SIZES.indexOf(s);
  if (letter >= 0) return [1, letter, s];
  if (isOneSizeLabel(s)) return [3, 0, s];
  return [2, 0, s];
}

/** Natural size order: 35 < 36.5 < 40, XS < S < M < XL, then anything else. */
export function compareSizes(a: string, b: string): number {
  const [ga, na, sa] = sizeRank(a);
  const [gb, nb, sb] = sizeRank(b);
  return ga - gb || na - nb || sa.localeCompare(sb, "es");
}

export function sortSizeStocks<T extends SizeStock>(list: T[]): T[] {
  return [...list].sort((a, b) => compareSizes(a.size, b.size));
}

/** In-stock sizes across every color, ordered: drives the card's "Talles 39 al 44". */
export function productSizesInStock(product: Product): string[] {
  const sizes = new Set<string>();
  for (const v of product.variants) {
    for (const s of v.sizeStocks) if (s.stock > 0 && !isOneSizeLabel(s.size)) sizes.add(s.size);
  }
  return [...sizes].sort(compareSizes);
}

/** "39 al 44" / "40" for the card hint. */
export function sizeRangeLabel(sizes: string[]): string {
  if (sizes.length <= 1) return sizes[0] ?? ONE_SIZE_LABEL;
  return `${sizes[0]} al ${sizes[sizes.length - 1]}`;
}

/** Sanitizes the raw jsonb value coming from the database. */
export function parseSizeStocks(raw: unknown): SizeStock[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const { size, stock } = entry as Record<string, unknown>;
    if (typeof size !== "string" || !size.trim()) return [];
    const n = typeof stock === "number" && Number.isFinite(stock) ? Math.max(0, Math.floor(stock)) : 0;
    return [{ size: size.trim(), stock: n }];
  });
}
