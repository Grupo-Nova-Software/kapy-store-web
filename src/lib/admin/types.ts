import type { SizeStock } from "@/types/store";

/** Result of an admin Server Action. Successful saves usually redirect instead. */
export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string };

export interface ColorInput {
  /** Existing `product_variants.id`; omitted for a new color. */
  id?: string;
  colorName: string;
  hexColor: string;
  imageUrl: string;
  sizeStocks: SizeStock[];
}

export interface ProductInput {
  /** Omitted when creating. */
  id?: string;
  name: string;
  brand: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  categoryId: string;
  badge: string | null;
  isActive: boolean;
  colors: ColorInput[];
}

export const BADGE_OPTIONS = ["Nuevo", "Oferta", "Top ventas"] as const;
