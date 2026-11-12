import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Guaranies, Product, ProductVariant } from "@/types/store";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats Guaraníes as "Gs. 350.000".
 * Deterministic on purpose (no Intl) so server and client output always match.
 */
export function formatGs(amount: Guaranies): string {
  const rounded = Math.round(amount);
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `Gs. ${rounded < 0 ? "-" : ""}${digits}`;
}

export function variantPrice(product: Product, variant: ProductVariant): Guaranies {
  return variant.priceOverride ?? product.price;
}

export function totalStock(product: Product): number {
  return product.variants.reduce((sum, v) => sum + v.stock, 0);
}

/** First variant with stock, falling back to the first one. */
export function defaultVariant(product: Product): ProductVariant {
  return product.variants.find((v) => v.stock > 0) ?? product.variants[0];
}

export function cartKey(productId: string, variantId: string): string {
  return `${productId}:${variantId}`;
}
